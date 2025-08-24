import { Response } from 'express';


export class ApiResponse {
  static success(res: Response, message: string, data?: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res: Response, message: string, statusCode: number = 500, errors?: any): void {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static badRequest(res: Response, message: string, errors?: any): void {
    this.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, message, 403);
  }

  static notFound(res: Response, message: string = 'Not Found'): void {
    this.error(res, message, 404);
  }

  static conflict(res: Response, message: string, errors?: any): void {
    this.error(res, message, 409, errors);
  }

  static internalServerError(res: Response, message: string = 'Internal Server Error'): void {
    this.error(res, message, 500);
  }

  static serviceUnavailable(res: Response, message: string = 'Service Unavailable'): void {
    this.error(res, message, 503);
  }
}
