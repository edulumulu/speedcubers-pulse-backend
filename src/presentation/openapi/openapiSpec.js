export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SpeedCubers Pulse API',
    version: '0.1.0',
    description: 'HTTP API for authentication, profiles, rankings, 1v1 competitions, video tokens, video quota and online presence.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API version',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Ranking' },
    { name: 'Competitions' },
    { name: 'Video' },
    { name: 'Presence' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PublicUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/AuthUser' },
          tokens: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
            },
          },
        },
      },
      WcaProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          wcaId: { type: 'string', example: '2022LUCA04' },
          countryIso2: { type: 'string', nullable: true, example: 'ES' },
        },
      },
      RankingEntry: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          event: { type: 'string', example: '3x3' },
          elo: { type: 'integer', example: 1000 },
          wins: { type: 'integer' },
          losses: { type: 'integer' },
          dnfCount: { type: 'integer' },
          totalMatches: { type: 'integer' },
          pbTime: { type: 'number', nullable: true },
          averageTime: { type: 'number', nullable: true },
        },
      },
      CompetitionRoom: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string', example: 'ABC123' },
          channelName: { type: 'string', example: 'match-abc123' },
          event: { type: 'string', example: '3x3' },
          status: {
            type: 'string',
            enum: ['waiting', 'active', 'completed', 'cancelled'],
          },
          host: { $ref: '#/components/schemas/PublicUser' },
          guest: {
            oneOf: [
              { $ref: '#/components/schemas/PublicUser' },
              { type: 'null' },
            ],
          },
          activeRound: {
            oneOf: [
              { $ref: '#/components/schemas/CompetitionRound' },
              { type: 'null' },
            ],
          },
          latestCompletedRound: {
            oneOf: [
              { $ref: '#/components/schemas/CompetitionRound' },
              { type: 'null' },
            ],
          },
        },
      },
      CompetitionRound: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          roundNumber: { type: 'integer', example: 1 },
          event: {
            type: 'string',
            enum: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb', 'megaminx', 'fto'],
            example: '3x3',
          },
          scramble: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'completed'] },
        },
      },
      Result: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          roundId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          timeMs: { type: 'integer', nullable: true, example: 7430 },
          penalty: { type: 'string', enum: ['none', '+2', '+4', 'dnf'] },
          finalTimeMs: { type: 'integer', nullable: true, example: 9430 },
        },
      },
      VideoQuota: {
        type: 'object',
        properties: {
          limitSeconds: { type: 'integer', example: 3600 },
          usedSeconds: { type: 'integer', example: 90 },
          remainingSeconds: { type: 'integer', example: 3510 },
          resetAt: { type: 'string', format: 'date-time' },
          global: {
            type: 'object',
            properties: {
              limitSeconds: { type: 'integer', example: 480000 },
              usedSeconds: { type: 'integer', example: 1200 },
              remainingSeconds: { type: 'integer', example: 478800 },
              resetAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      VideoToken: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          channelName: { type: 'string', example: 'match-abc123' },
          uid: { type: 'integer', example: 3025571201 },
          token: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          quota: { $ref: '#/components/schemas/VideoQuota' },
        },
      },
      OnlineUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          connectedAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid JWT',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  paths: {
    '/auth/check': {
      get: {
        tags: ['Auth'],
        summary: 'Check whether a username or email is already taken',
        parameters: [
          { name: 'username', in: 'query', schema: { type: 'string' } },
          { name: 'email', in: 'query', schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          200: {
            description: 'Availability result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: {
                      type: 'object',
                      properties: { taken: { type: 'boolean' } },
                    },
                    email: {
                      type: 'object',
                      properties: { taken: { type: 'boolean' } },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 2, maxLength: 20 },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                  wca_id: { type: 'string', example: '2022LUCA04' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registered user and access token',
            headers: {
              'Set-Cookie': {
                schema: { type: 'string' },
                description: 'httpOnly refresh token cookie',
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated user and access token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh an access token from the httpOnly cookie',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refresh_token: {
                    type: 'string',
                    description: 'Legacy body fallback. Prefer the httpOnly cookie.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New access token and rotated refresh cookie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and clear the refresh cookie',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Logged out' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/link-wca': {
      post: {
        tags: ['Auth'],
        summary: 'Link a WCA ID to the authenticated user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['wca_id'],
                properties: {
                  wca_id: { type: 'string', example: '2022LUCA04' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Linked WCA profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { wcaProfile: { $ref: '#/components/schemas/WcaProfile' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { $ref: '#/components/responses/ValidationError' },
        },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Unlink the authenticated user WCA profile',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Unlinked' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Anti-enumeration success response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a temporary token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Private profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/AuthUser' },
                    wcaProfile: { $ref: '#/components/schemas/WcaProfile' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update authenticated user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 2, maxLength: 20 },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/AuthUser' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete authenticated user account',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/online': {
      get: {
        tags: ['Presence'],
        summary: 'List currently online users',
        responses: {
          200: {
            description: 'Online users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/OnlineUser' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/users/{username}': {
      get: {
        tags: ['Users'],
        summary: 'Get public profile by username',
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Public profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/PublicUser' },
                    wcaProfile: { $ref: '#/components/schemas/WcaProfile' },
                    ranking: { $ref: '#/components/schemas/RankingEntry' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/ranking': {
      get: {
        tags: ['Ranking'],
        summary: 'Get top 100 leaderboard for an event',
        parameters: [
          {
            name: 'event',
            in: 'query',
            schema: {
              type: 'string',
              default: '3x3',
              enum: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb', 'megaminx', 'fto'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Leaderboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                    ranking: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/RankingEntry' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/ranking/users/{userId}': {
      get: {
        tags: ['Ranking'],
        summary: 'Get ranking stats for a user',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'event', in: 'query', schema: { type: 'string', default: '3x3' } },
        ],
        responses: {
          200: {
            description: 'User ranking stats',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RankingEntry' },
              },
            },
          },
          404: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/competitions': {
      post: {
        tags: ['Competitions'],
        summary: 'Create a private 1v1 competition room',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  event: {
                    type: 'string',
                    default: '3x3',
                    enum: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb', 'megaminx', 'fto'],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created competition room',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { competition: { $ref: '#/components/schemas/CompetitionRoom' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/competitions/join': {
      post: {
        tags: ['Competitions'],
        summary: 'Join a private competition room by code',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string', minLength: 6, maxLength: 6, example: 'ABC123' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Joined competition room',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { competition: { $ref: '#/components/schemas/CompetitionRoom' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/competitions/{code}': {
      get: {
        tags: ['Competitions'],
        summary: 'Get a competition room by code',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string', minLength: 6, maxLength: 6 } },
        ],
        responses: {
          200: {
            description: 'Competition room',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { competition: { $ref: '#/components/schemas/CompetitionRoom' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/competitions/{code}/round/event': {
      patch: {
        tags: ['Competitions'],
        summary: 'Change the cube event for the active round before results are submitted',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string', minLength: 6, maxLength: 6 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event'],
                properties: {
                  event: {
                    type: 'string',
                    enum: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb', 'megaminx', 'fto'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated competition room with regenerated active round scramble',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { competition: { $ref: '#/components/schemas/CompetitionRoom' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/competitions/{code}/results': {
      post: {
        tags: ['Competitions'],
        summary: 'Submit one result for the active round',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string', minLength: 6, maxLength: 6 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['timeMs'],
                properties: {
                  timeMs: { type: 'integer', nullable: true, minimum: 0, maximum: 600000 },
                  penalty: { type: 'string', default: 'none', enum: ['none', '+2', '+4', 'dnf'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Submitted result and round state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { result: { $ref: '#/components/schemas/Result' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/video/token': {
      post: {
        tags: ['Video'],
        summary: 'Create an Agora RTC token for a channel',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['channelName'],
                properties: { channelName: { type: 'string', minLength: 3, maxLength: 63 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'RTC token and current monthly quota',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VideoToken' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/video/usage': {
      post: {
        tags: ['Video'],
        summary: 'Report consumed video seconds for the current user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['seconds'],
                properties: { seconds: { type: 'integer', minimum: 1, maximum: 3600 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated monthly video quota',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { quota: { $ref: '#/components/schemas/VideoQuota' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};
