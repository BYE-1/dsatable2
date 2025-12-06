package de.byedev.dsatable2.dsa_table_backend.web.exception;

/**
 * Exception thrown when authentication or authorization fails
 */
public class UnauthorizedException extends RuntimeException {
    
    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}

