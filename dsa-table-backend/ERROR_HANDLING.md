# Error Handling Guide

This document describes the standardized error handling system for the DSA Table Backend REST API.

## Overview

The API uses a global exception handler (`GlobalExceptionHandler`) that provides consistent error responses across all endpoints. All errors are returned in a standardized `ErrorResponse` format.

## Error Response Format

All error responses follow this structure:

```json
{
  "timestamp": "2024-12-06T18:00:00",
  "status": 404,
  "error": "Resource Not Found",
  "message": "User not found with username: 'john'",
  "path": "/api/users/john",
  "validationErrors": null,
  "details": null
}
```

### Fields

- **timestamp**: When the error occurred (ISO 8601 format)
- **status**: HTTP status code
- **error**: Error type/category
- **message**: Human-readable error message
- **path**: The API endpoint that was called
- **validationErrors**: Array of validation errors (only present for validation failures)
- **details**: Additional error details (only in development mode)

## Custom Exceptions

### ResourceNotFoundException

Use when a requested resource doesn't exist:

```java
throw new ResourceNotFoundException("User", "id", userId);
// Returns: "User not found with id: '123'"

throw new ResourceNotFoundException("Character not found");
// Returns: "Character not found"
```

### BadRequestException

Use for invalid requests:

```java
throw new BadRequestException("Invalid character data provided");
```

### UnauthorizedException

Use for authentication/authorization failures:

```java
throw new UnauthorizedException("Invalid or expired token");
```

## Usage Examples

### Example 1: Resource Not Found

**Controller:**
```java
@GetMapping("/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    return ResponseEntity.ok(user);
}
```

**Error Response (404):**
```json
{
  "timestamp": "2024-12-06T18:00:00",
  "status": 404,
  "error": "Resource Not Found",
  "message": "User not found with id: '999'",
  "path": "/api/users/999"
}
```

### Example 2: Validation Errors

**Controller:**
```java
@PostMapping
public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
    // Validation handled automatically by @Valid
    User user = userService.createUser(request);
    return ResponseEntity.ok(user);
}
```

**Error Response (400):**
```json
{
  "timestamp": "2024-12-06T18:00:00",
  "status": 400,
  "error": "Validation Failed",
  "message": "Request validation failed. Please check the validation errors.",
  "path": "/api/users",
  "validationErrors": [
    {
      "field": "username",
      "rejectedValue": "",
      "message": "Username cannot be empty"
    },
    {
      "field": "email",
      "rejectedValue": "invalid-email",
      "message": "Must be a valid email address"
    }
  ]
}
```

### Example 3: Bad Request

**Controller:**
```java
@PutMapping("/{id}")
public ResponseEntity<Character> updateCharacter(
        @PathVariable Long id, 
        @RequestBody Character character) {
    if (character.getId() != null && !character.getId().equals(id)) {
        throw new BadRequestException("Character ID in body must match path parameter");
    }
    // ... update logic
}
```

**Error Response (400):**
```json
{
  "timestamp": "2024-12-06T18:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Character ID in body must match path parameter",
  "path": "/api/characters/123"
}
```

## Handled Exception Types

The `GlobalExceptionHandler` automatically handles:

1. **ResourceNotFoundException** → 404 Not Found
2. **BadRequestException** → 400 Bad Request
3. **UnauthorizedException** → 401 Unauthorized
4. **AccessDeniedException** → 403 Forbidden
5. **MethodArgumentNotValidException** → 400 Bad Request (with validation errors)
6. **ConstraintViolationException** → 400 Bad Request (with validation errors)
7. **MethodArgumentTypeMismatchException** → 400 Bad Request (invalid parameter type)
8. **HttpMessageNotReadableException** → 400 Bad Request (malformed JSON)
9. **NoHandlerFoundException** → 404 Not Found (endpoint doesn't exist)
10. **IllegalArgumentException** → 400 Bad Request
11. **Exception** → 500 Internal Server Error (catch-all)

## Best Practices

1. **Use specific exceptions**: Prefer `ResourceNotFoundException` over generic `RuntimeException`
2. **Provide clear messages**: Error messages should help API consumers understand what went wrong
3. **Use validation annotations**: Use `@Valid` and Bean Validation annotations instead of manual validation
4. **Don't catch exceptions unnecessarily**: Let the global handler process exceptions unless you need specific handling
5. **Log appropriately**: The handler logs errors at appropriate levels (DEBUG for expected errors, ERROR for unexpected)

## Migration Guide

### Before (Old Pattern):
```java
@GetMapping("/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    return userRepository.findById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
}
```

### After (New Pattern):
```java
@GetMapping("/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    return ResponseEntity.ok(user);
}
```

### Before (Old Pattern):
```java
if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
}
```

### After (New Pattern):
```java
if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedException("Authentication required");
}
```

## Testing Error Responses

You can test error responses using curl:

```bash
# Test 404
curl -v http://localhost:8080/api/users/999

# Test validation error
curl -v -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":""}'

# Test malformed JSON
curl -v -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

## Frontend Integration

The frontend can now handle errors consistently:

```typescript
try {
  const response = await fetch('/api/users/123');
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error ${error.status}: ${error.message}`);
    if (error.validationErrors) {
      // Handle validation errors
      error.validationErrors.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    }
  }
} catch (error) {
  // Handle network errors
}
```

