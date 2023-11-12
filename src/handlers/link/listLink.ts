import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";
import { isLogin } from "../../services/isLogin";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function listLink(
  event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = await isLogin(event);
    if (!userId) {
      throw new ApiError("Authorization header missing", 401);
    }

    const linksByUserIdlCmd = new QueryCommand({
      TableName: process.env.LINK_TABLE_NAME,
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    const linksOwnerUser = await docClient.send(linksByUserIdlCmd);

    const filteredLinks = linksOwnerUser.Items.map((link) => ({
      shortLink: link.shortLink,
      clicks: link.clicks,
      isActive: link.isActive,
    }));
    return {
      statusCode: 200,
      body: JSON.stringify({
        links: filteredLinks,
      }),
    };
  } catch (err) {
    throw new ApiError(err.message, err.statusCode);
  }
}

export const handler = middyMy(listLink);
