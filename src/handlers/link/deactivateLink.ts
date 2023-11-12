import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQS } from "@aws-sdk/client-sqs";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";
import { isLogin } from "../../services/isLogin";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sqs = new SQS();

async function deactivateLink(
  event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = await isLogin(event);
    if (!userId) {
      throw new ApiError("Authorization header missing", 401);
    }
    const { linkId } = event.pathParameters || {};

    const linkItemInTableCmd = new GetCommand({
      TableName: process.env.LINK_TABLE_NAME,
      Key: { linkId: linkId },
    });

    const { Item } = await docClient.send(linkItemInTableCmd);
    if (!Item) {
      throw new ApiError("Link not found or access denied", 404);
    }
    if (!Item.isActive) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Link ${Item.shortLink} is already deactivated`,
        }),
      };
    }

    const updateCmd = new UpdateCommand({
      TableName: process.env.LINK_TABLE_NAME,
      Key: { linkId: linkId },
      UpdateExpression: "set isActive = :isActive",
      ExpressionAttributeValues: { ":isActive": false },
      ConditionExpression: "attribute_exists(linkId)",
      ReturnValues: "UPDATED_NEW",
    });

    await docClient.send(updateCmd);
    const { userEmail, originalLink } = Item;

    const notify = {
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: "Serverless co",
        body: `Link ${originalLink} successfully deactivated`,
        recipient: userEmail,
      }),
    };
    await sqs.sendMessage(notify);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Link ${Item.shortLink} successfully deactivated`,
      }),
    };
  } catch (err) {
    console.log(err);
    throw new ApiError(err.message, err.statusCode);
  }
}

export const handler = middyMy(deactivateLink);
