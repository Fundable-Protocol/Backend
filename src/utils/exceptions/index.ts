export class ApiError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class NotFoundException extends ApiError {
    constructor(message = "Not Found") {
        super(message, 404);
    }
}
