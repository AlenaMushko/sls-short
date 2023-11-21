import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import crypto from "crypto";
import { v4 as uuid } from "uuid";

import { LinkConstants } from "../../constants";
import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";
import { isLogin } from "../../services/isLogin";
import { ErrorResponse, ValidationErrorDetails } from "../../types";
import { ILink } from "../../types/link.type";
import linkSchema from "../../validations/linkSchema";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function createLink(
  event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const { userId, email } = await isLogin(event);
    if (!userId) {
      throw new ApiError("Authorization header missing", 401);
    }

    const body = event.body as unknown as ILink;
    if (!body || !body.originalLink || !body.lifeTime) {
      throw new ApiError("OriginalLink and lifeTime are required", 400);
    }
    const { originalLink, lifeTime } = body;
    const date = new Date().toISOString();
    const shortId = crypto.randomBytes(3).toString("hex");
    const shortLink = `http://localhost:3000/${shortId}`;
    const oneDayS = 1 * 24 * 60 * 60 * 1000;
    let linkLifeTime = "";

    switch (lifeTime) {
      case LinkConstants.AFTER_THE_LINK:
        linkLifeTime = "0";
        break;
      case LinkConstants.ONE_DAY:
        linkLifeTime = new Date(Date.now() + oneDayS).toISOString();
        break;
      case LinkConstants.THREE_DAYS:
        linkLifeTime = new Date(Date.now() + 3 * oneDayS).toISOString();
        break;
      case LinkConstants.ONE_WEEK:
        linkLifeTime = new Date(Date.now() + 7 * oneDayS).toISOString();
        break;
      default:
        throw new ApiError(`Invalid life time value: ${lifeTime}`, 400);
    }

    const newLinkItem: ILink = {
      linkId: uuid(),
      originalLink: originalLink.trim(),
      shortLink,
      clicks: 0,
      lifeTime: linkLifeTime,
      createdAt: date,
      isActive: true,
      userId,
      userEmail: email,
    };

    const commandLink = new PutCommand({
      TableName: process.env.LINK_TABLE_NAME,
      Item: newLinkItem,
    });
    await docClient.send(commandLink);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Created a short link",
        shortLink,
      }),
    };
  } catch (e: any) {
    let responseMessage: ErrorResponse = {
      message: "An unexpected error occurred while processing your request.",
    };

    if ("details" in e && Array.isArray(e.details)) {
      responseMessage = {
        message: "There were validation errors with your request.",
        details: e.details.map(
          (detail: ValidationErrorDetails) => detail.message,
        ),
      };
    } else if ("message" in e) {
      responseMessage.message = e.message;
    }

    return {
      statusCode: e.statusCode || 500,
      body: JSON.stringify(responseMessage),
    };
  }
}

export const handler = middyMy(createLink).use(
  validator({
    eventSchema: transpileSchema(linkSchema),
  }),
);
