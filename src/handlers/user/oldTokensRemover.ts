import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { ApiError } from "../../errors";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function oldTokensRemover(): Promise<void> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const queryCmd = new QueryCommand({
    TableName: process.env.TOKENS_TABLE_NAME,
    IndexName: "CreatedAtIndex",
    KeyConditionExpression: "createdAt <= :sevenDaysAgo",
    ExpressionAttributeValues: {
      ":sevenDaysAgo": sevenDaysAgo,
    },
  });

  try {
    const { Items } = await docClient.send(queryCmd);

    if (!Items.length) {
      throw new ApiError("No tokens to delete", 400);
    }

    const deleteRequests = Items.map((item) => ({
      DeleteRequest: {
        Key: {
          tokenId: item.tokenId,
        },
      },
    }));

    const batchWriteCmd = new BatchWriteCommand({
      RequestItems: {
        [process.env.TOKENS_TABLE_NAME]: deleteRequests,
      },
    });

    await docClient.send(batchWriteCmd);
  } catch (error) {
    throw error;
  }
}

export const handler = oldTokensRemover;
