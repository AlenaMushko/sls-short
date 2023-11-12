export interface IUser {
  userId: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuth {
  email: string;
  password: string;
}

export interface IJwe {
  tokenId: string;
  token: string;
  createdAt: string;
}

export interface IUserToken {
  userId: string;
  email: string;
}
