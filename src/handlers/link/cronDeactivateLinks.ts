import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQS } from "@aws-sdk/client-sqs";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";

import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sqs = new SQS();

async function cronDeactivateLinks(): Promise<APIGatewayProxyResult> {
  const dateNow = new Date().toISOString();

  try {
    const scanCmd = new ScanCommand({
      TableName: process.env.LINK_TABLE_NAME,
      FilterExpression: "lifeTime <= :dateNow AND isActive = :isActive",
      ExpressionAttributeValues: {
        ":dateNow": dateNow,
        ":isActive": true,
      },
    });

    const filteredItems = await docClient.send(scanCmd);
    for (const item of filteredItems.Items) {
      const updateCmd = new UpdateCommand({
        TableName: process.env.LINK_TABLE_NAME,
        Key: { linkId: item.linkId },
        UpdateExpression: "set isActive = :isActive",
        ExpressionAttributeValues: { ":isActive": false },
        ReturnValues: "UPDATED_NEW",
      });

      const { userEmail, originalLink } = item;

      const notify = {
        QueueUrl: process.env.MAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
          subject: "Serverless co",
          body: `Link ${originalLink} successfully deactivated`,
          recipient: userEmail,
        }),
      };

      Promise.all([docClient.send(updateCmd), sqs.sendMessage(notify)]);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully deactivated ${filteredItems.Items.length} links`,
      }),
    };
  } catch (err) {
    console.log(err);
    throw new ApiError(err.message, err.statusCode);
  }
}

export const handler = middyMy(cronDeactivateLinks);
