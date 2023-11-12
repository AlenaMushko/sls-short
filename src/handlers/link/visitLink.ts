import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQS } from "@aws-sdk/client-sqs";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sqs = new SQS();

async function visitLink(
  event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const { shortId } = event.pathParameters || {};
    const shortLink = `http://localhost:3000/${shortId}`;

    const linkBypathParameterCmd = new QueryCommand({
      TableName: process.env.LINK_TABLE_NAME,
      IndexName: "ShortLinkIndex",
      KeyConditionExpression: "shortLink = :shortLink",
      ExpressionAttributeValues: {
        ":shortLink": shortLink,
      },
    });

    const { Items } = await docClient.send(linkBypathParameterCmd);
    const currentLink = Items[0];

    if (!currentLink) {
      throw new ApiError("Link not found", 404);
    }

    if (!currentLink.isActive) {
      throw new ApiError("Link not active", 404);
    }

    const linkId = currentLink.linkId;

    const updateCmd = new UpdateCommand({
      TableName: process.env.LINK_TABLE_NAME,
      Key: { linkId: linkId },
      UpdateExpression:
        currentLink.lifeTime === "0"
          ? "set isActive = :newValue"
          : "set clicks = :newValue",
      ExpressionAttributeValues: {
        ":newValue":
          currentLink.lifeTime === "0" ? false : currentLink.clicks + 1,
      },
      ConditionExpression: "attribute_exists(linkId)",
      ReturnValues: "UPDATED_NEW",
    });

    await docClient.send(updateCmd);
    if (currentLink.lifeTime === "0") {
      const notify = {
        QueueUrl: process.env.MAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
          subject: "Link Deactivated",
          body: `Your link ${shortLink} has been deactivated.`,
          recipient: currentLink.userEmail,
        }),
      };

      await sqs.sendMessage(notify);
    }
    const originalLink = currentLink.originalLink;

    return {
      statusCode: 200,
      body: JSON.stringify({
        link: originalLink,
      }),
    };
  } catch (err) {
    throw new ApiError(err.message, err.statusCode);
  }
}

export const handler = middyMy(visitLink);
