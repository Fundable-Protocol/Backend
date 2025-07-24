import 'express';

declare module 'express' {
  export interface User {
    id: string;
    walletAddress: string;
    // add other user properties as needed
  }

  export interface Request {
    user: User;
  }
}
