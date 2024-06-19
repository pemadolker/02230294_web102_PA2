# Pokémon API

Welcome to the Pokémon AP. This API allows us to manage Pokémon data, including capturing and viewing caught Pokémon, similar to the functionalities provided by the PokeAPI.

## Introduction

This API is build using the Hono framework and integrates with a PostgreSQL database using Prisma ORM. It provides comprehensive functionalities for managing Pokémon data, including registration, authentication, capturing Pokémon, and more.

## Features

- **RESTful API**: Implements CRUD operations (Create, Read, Update, Delete) for Pokémon resources.
- **Authentication**: Token-based authentication ensures secure access to user-specific Pokémon data.
- **Rate Limiting**: Limits the number of requests to ensure server stability.
- **Pagination**: Allows retrieval of Pokémon data in paginated data for improved performance.
- **Error Handling**: Provides clear and informative error messages with appropriate HTTP status codes.
- **Documentation**: Includes detailed documentation of endpoints, request/response formats, and authentication mechanisms.

## Technologies Used

- **Hono**: Modern web framework for handling HTTP requests.
- **Prisma**: ORM tool for interacting with the PostgreSQL database to store Pokémon and user data.
- **JSON Web Tokens (JWT)**: Token-based authentication for securing API endpoints.
- **Axios**: HTTP client for making requests to external APIs.
- **bcrypt**: Library for hashing passwords securely.
- **axios**: Library for making HTTP requests to fetch Pokémon data from the PokeAPI.

## Endpoints

### Pokémon Resources

- **GET /pokemon/:name**: Fetches data for a specific Pokémon by name.
- **POST /register**: Registers a new user with email and password.
- **POST /login**: Authenticates user credentials and generates JWT token for access.
- **POST /protected/catch**: Adds a Pokémon to a user's collection (requires authentication).
- **DELETE /protected/release/:id**: Releases a Pokémon from a user's collection (requires authentication).
- **GET /protected/caught**: Retrieves paginated list of Pokémon caught by a user (requires authentication).

## Authentication

The API uses JSON Web Tokens (JWT) for authentication. To access protected parts of the API, users must include a valid JWT token in their request. Tokens are generated when users login succesfully adn expires after sometime.

## Rate Limiting

To keep the server running smoothly and prevent misuse, the API limits how many requests can be made from each IP address. 

## Pagination

For endpoints that return lots of data, like `/protected/caught`, the API has pagination. This means clients can ask for data in smaller chunks .

## Error Handling

The API handles errors carefully to ensure everything runs smoothly for users. When something goes wrong, it sends clear messages and uses the right HTTP status codes to explain what happened. This helps keep responses consistent across the entire API.
