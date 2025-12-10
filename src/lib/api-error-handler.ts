import { NextResponse } from 'next/server';

export interface APIError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  statusCode?: number;
  timestamp?: string;
}

export class APIErrorHandler {
  static logError(context: string, error: any, additionalData?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`🔥 [${context}] Error at ${timestamp}:`);
    console.error(`🔥 [${context}] Message:`, error.message);
    console.error(`🔥 [${context}] Code:`, error.code);
    console.error(`🔥 [${context}] Details:`, error.details);
    console.error(`🔥 [${context}] Hint:`, error.hint);

    if (additionalData) {
      console.error(`🔥 [${context}] Additional Data:`, JSON.stringify(additionalData, null, 2));
    }

    if (error.stack) {
      console.error(`🔥 [${context}] Stack:`, error.stack);
    }
  }

  static handleDatabaseError(context: string, error: any, additionalData?: any): NextResponse {
    this.logError(context, error, additionalData);

    // Table doesn't exist
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      const tableName = error.message.match(/relation "([^"]+)" does not exist/)?.[1] || 'unknown';
      return NextResponse.json({
        error: `Database table '${tableName}' not found`,
        details: `The ${tableName} table needs to be created in your database`,
        code: 'TABLE_NOT_EXISTS',
        sqlHint: `Run the database migration to create the ${tableName} table`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Column doesn't exist
    if (error.code === '42703') {
      return NextResponse.json({
        error: 'Database schema mismatch',
        details: `Column error: ${error.message}`,
        code: error.code,
        hint: 'The database table structure may not match the expected schema',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // RLS policy violations
    if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('policy')) {
      return NextResponse.json({
        error: 'Database permission denied',
        details: 'Row Level Security policy violation - user does not have permission',
        code: error.code || 'RLS_VIOLATION',
        hint: 'Check RLS policies and user permissions',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json({
        error: 'Duplicate data detected',
        details: `Unique constraint violation: ${error.message}`,
        code: error.code,
        hint: 'This record already exists with the same unique field',
        timestamp: new Date().toISOString()
      }, { status: 409 });
    }

    // Foreign key violations
    if (error.code === '23503') {
      return NextResponse.json({
        error: 'Invalid reference',
        details: `Foreign key constraint violation: ${error.message}`,
        code: error.code,
        hint: 'Referenced ID does not exist in the related table',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Check constraint violations
    if (error.code === '23514') {
      return NextResponse.json({
        error: 'Invalid data value',
        details: `Check constraint violation: ${error.message}`,
        code: error.code,
        hint: 'One or more field values do not meet the database constraints',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Generic database error
    return NextResponse.json({
      error: `Database error in ${context}`,
      details: error.message || 'Unknown database error',
      code: error.code || 'DB_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }

  static handleAuthError(context: string, error: any): NextResponse {
    this.logError(context, error);

    return NextResponse.json({
      error: 'Authentication failed',
      details: error?.message || 'User session is invalid or expired',
      code: 'AUTH_ERROR',
      hint: 'Please sign in again',
      timestamp: new Date().toISOString()
    }, { status: 401 });
  }

  static handleValidationError(context: string, message: string, receivedData?: any): NextResponse {
    console.error(`🔥 [${context}] Validation Error: ${message}`);
    if (receivedData) {
      console.error(`🔥 [${context}] Received Data:`, JSON.stringify(receivedData, null, 2));
    }

    return NextResponse.json({
      error: 'Validation failed',
      details: message,
      code: 'VALIDATION_ERROR',
      receivedData: receivedData || null,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }

  static handleGenericError(context: string, error: any): NextResponse {
    this.logError(context, error);

    return NextResponse.json({
      error: `Internal server error in ${context}`,
      details: error?.message || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }

  static handleNotFoundError(context: string, resource: string, id?: string): NextResponse {
    console.error(`🔥 [${context}] Not Found: ${resource}${id ? ` with ID ${id}` : ''}`);

    return NextResponse.json({
      error: `${resource} not found`,
      details: `The requested ${resource.toLowerCase()}${id ? ` with ID ${id}` : ''} could not be found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }, { status: 404 });
  }

  static createSuccessResponse(data: any, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}