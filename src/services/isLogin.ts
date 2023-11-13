import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent } from "aws-lambda";

import { ApiError } from "../errors";
import { IUserToken } from "../types";
import { decryptToken } from "./jweService";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function isLogin(event: APIGatewayEvent): Promise<IUserToken> {
  try {
    const authorization = event.headers.authorization;

    if (!authorization) {
      throw new ApiError("Authorization header missing", 401);
    }

    const [bearer, token] = authorization.split(" ");
    if (!bearer || !token) {
      throw new ApiError("Not authorized", 401);
    }

    const { userId } = await decryptToken(token);
    const commandUserById = new GetCommand({
      TableName: process.env.USERS_TABLE_NAME,
      Key: {
        userId: userId,
      },
    });
    const userById = await docClient.send(commandUserById);
    const owner = userById.Item as IUserToken;

    if (!userById){
      throw new ApiError("User not found", 404);
    }

    if (!owner) {
      throw new ApiError("Token not valid", 401);
    }

    return owner;
  } catch (err: any) {
    console.log(err.message);
    throw err;
  }
}
