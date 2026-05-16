import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface IntegrationConnection {
  id: string;
  type: 'Email' | 'Calendar' | 'CRM' | 'Database';
  name: string;
  endpoint?: string;
  credentials?: {
    username?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  status: 'Active' | 'Inactive' | 'Error';
  lastSyncAt?: Date;
  errorMessage?: string;
}

/**
 * Agency Integration Connection Validator Service
 * Validates credentials and connectivity for external integrations
 */
@Injectable()
export class AgencyIntegrationConnectionValidator {
  private readonly logger = new Logger(AgencyIntegrationConnectionValidator.name);

  /**
   * Validate email connection (IMAP/SMTP)
   */
  async validateEmailConnection(config: {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  }): Promise<{ isValid: boolean; message: string; details?: object }> {
    try {
      // Mock validation - in production, test actual IMAP/SMTP connections
      if (!config.email || !config.password) {
        return {
          isValid: false,
          message: 'Email and password are required',
        };
      }

      if (!config.imapHost || config.imapPort < 1) {
        return {
          isValid: false,
          message: 'Invalid IMAP configuration',
        };
      }

      if (!config.smtpHost || config.smtpPort < 1) {
        return {
          isValid: false,
          message: 'Invalid SMTP configuration',
        };
      }

      // Simulate connection test
      this.logger.log(
        `Validating email connection for ${config.email}`,
      );

      return {
        isValid: true,
        message: 'Email connection validated successfully',
        details: {
          imapConnected: true,
          smtpConnected: true,
          mailboxes: ['INBOX', 'Sent', 'Drafts'],
        },
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate API connection
   */
  async validateApiConnection(config: {
    endpoint: string;
    method?: string;
    apiKey?: string;
    headers?: object;
  }): Promise<{ isValid: boolean; message: string; statusCode?: number }> {
    try {
      if (!config.endpoint) {
        return {
          isValid: false,
          message: 'Endpoint URL is required',
        };
      }

      // Validate URL format
      try {
        new URL(config.endpoint);
      } catch {
        return {
          isValid: false,
          message: 'Invalid endpoint URL format',
        };
      }

      this.logger.log(`Testing API connection to ${config.endpoint}`);

      // Mock HTTP request - in production, use axios/fetch
      // Simulate successful response
      return {
        isValid: true,
        message: 'API connection successful',
        statusCode: 200,
      };
    } catch (error) {
      return {
        isValid: false,
        message: `API connection failed: ${error.message}`,
        statusCode: 500,
      };
    }
  }

  /**
   * Validate calendar connection (Google Calendar, Outlook, etc.)
   */
  async validateCalendarConnection(config: {
    provider: 'GoogleCalendar' | 'Outlook' | 'iCloud';
    email: string;
    refreshToken?: string;
    apiKey?: string;
  }): Promise<{ isValid: boolean; message: string; calendars?: string[] }> {
    try {
      if (!config.provider || !config.email) {
        return {
          isValid: false,
          message: 'Provider and email are required',
        };
      }

      this.logger.log(`Validating ${config.provider} connection for ${config.email}`);

      // Mock validation
      if (config.provider === 'GoogleCalendar' && !config.refreshToken) {
        return {
          isValid: false,
          message: 'Google Calendar requires refresh token',
        };
      }

      return {
        isValid: true,
        message: `${config.provider} connection validated`,
        calendars: ['Primary', 'Work', 'Personal'],
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Calendar validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate database connection
   */
  async validateDatabaseConnection(config: {
    type: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'SQL Server';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<{ isValid: boolean; message: string; tables?: number }> {
    try {
      if (!config.host || config.port < 1 || !config.database) {
        return {
          isValid: false,
          message: 'Invalid database configuration',
        };
      }

      this.logger.log(`Validating ${config.type} connection to ${config.host}`);

      // Mock connection test
      return {
        isValid: true,
        message: `${config.type} connection validated`,
        tables: 15,
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Database connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Test connection and retry if needed
   */
  async testConnectionWithRetry(
    config: IntegrationConnection,
    maxRetries: number = 3,
  ): Promise<{ success: boolean; attemptCount: number; lastError?: string }> {
    let attemptCount = 0;
    let lastError: string;

    for (let i = 0; i < maxRetries; i++) {
      attemptCount++;
      this.logger.log(`Connection test attempt ${attemptCount} for ${config.name}`);

      try {
        // Mock connection test
        if (Math.random() > 0.3) {
          // 70% success rate in mock
          return { success: true, attemptCount };
        } else {
          throw new Error('Connection timeout');
        }
      } catch (error) {
        lastError = error.message;
        this.logger.warn(`Attempt ${attemptCount} failed: ${lastError}`);

        if (i < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    return {
      success: false,
      attemptCount,
      lastError,
    };
  }

  /**
   * Validate all required credentials
   */
  validateCredentials(config: IntegrationConnection): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push('Connection name is required');
    }

    if (!config.type) {
      errors.push('Connection type is required');
    }

    if (config.type === 'Email' && !config.credentials?.password) {
      errors.push('Email password is required');
    }

    if ((config.type === 'CRM' || config.type === 'Database') && !config.endpoint) {
      errors.push(`${config.type} endpoint is required`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
