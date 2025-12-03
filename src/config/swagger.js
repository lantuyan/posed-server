const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pose Backend API',
      version: '1.0.0',
      description: 'API documentation for Pose Backend - Image and Category Management System',
      contact: {
        name: 'Pose AI Agent System',
        email: 'support@pose.ai'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://103.21.148.74:3003',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for admin/editor authentication'
        },
        StaticTokenAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'token',
          description: 'Encrypted time-based token for public API access. Token format: Encrypted "STATIC_USER_TOKEN|yyyy-mm-dd hh:mm:ss" using AES-256-CBC. Token must be generated with current timestamp and is valid within ±30 seconds (configurable via USER_TOKEN_EXPIRY_SECONDS). Use the generate-user-token script to create valid tokens.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            totalItems: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 5
            },
            currentPage: {
              type: 'integer',
              example: 1
            },
            items: {
              type: 'array',
              items: {}
            }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              example: 'Nature'
            },
            description: {
              type: 'string',
              example: 'Beautiful nature images'
            },
            status: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Image: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              example: 'Sunset Beach'
            },
            description: {
              type: 'string',
              example: 'Beautiful sunset at the beach'
            },
            fileName: {
              type: 'string',
              example: 'sunset-beach.jpg'
            },
            filePath: {
              type: 'string',
              example: '/uploads/images/sunset-beach.jpg'
            },
            mimeType: {
              type: 'string',
              example: 'image/jpeg'
            },
            size: {
              type: 'integer',
              example: 2048576
            },
            width: {
              type: 'integer',
              example: 1920
            },
            height: {
              type: 'integer',
              example: 1080
            },
            categoryIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['507f1f77bcf86cd799439011']
            },
            status: {
              type: 'boolean',
              example: true
            },
            countUsage: {
              type: 'integer',
              example: 150
            },
            countFavorite: {
              type: 'integer',
              example: 25
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        UserSubmission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '68e0c70a77bc9f407c737db3'
            },
            originalFileName: {
              type: 'string',
              example: 'user-photo.jpg'
            },
            fileName: {
              type: 'string',
              example: '7b7f2e6b-9c61-4f4d-9c19-5a1c1bb9f772.jpg'
            },
            filePath: {
              type: 'string',
              example: 'uploads/user-submissions/7b7f2e6b-9c61-4f4d-9c19-5a1c1bb9f772.jpg'
            },
            fileUrl: {
              type: 'string',
              example: 'https://api.pose.ai/uploads/user-submissions/7b7f2e6b-9c61-4f4d-9c19-5a1c1bb9f772.jpg'
            },
            mimeType: {
              type: 'string',
              example: 'image/jpeg'
            },
            size: {
              type: 'integer',
              example: 1048576
            },
            width: {
              type: 'integer',
              example: 1080
            },
            height: {
              type: 'integer',
              example: 1920
            },
            status: {
              type: 'string',
              example: 'pending'
            },
            assignedCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' }
                }
              }
            },
            reviewNotes: {
              type: 'string',
              example: 'Looks good. Assigning to portrait category.'
            },
            reviewedBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string' }
              }
            },
            reviewedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            linkedImageId: {
              type: 'string',
              nullable: true,
              example: '68e0c70a77bc9f407c737db4'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            },
            submissionMeta: {
              type: 'object',
              nullable: true,
              properties: {
                tokenTime: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true
                },
                tokenTimeString: {
                  type: 'string',
                  example: '2025-11-13 22:40:00'
                },
                timeDiffSeconds: {
                  type: 'integer',
                  example: 5
                },
                ipAddress: {
                  type: 'string',
                  example: '192.168.1.10'
                },
                userAgent: {
                  type: 'string',
                  example: 'PoseApp/1.0 (iPhone; iOS 18.0)'
                }
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'admin'
            },
            password: {
              type: 'string',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011'
                },
                username: {
                  type: 'string',
                  example: 'admin'
                },
                role: {
                  type: 'string',
                  enum: ['admin', 'editor'],
                  example: 'admin'
                }
              }
            }
          }
        },
        CategoryRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              example: 'Nature'
            },
            description: {
              type: 'string',
              example: 'Beautiful nature images'
            },
            newId: {
              type: 'string',
              description: 'Optional new MongoDB ObjectId to replace the current category id',
              example: '507f1f77bcf86cd799439012'
            }
          }
        },
        ImageMetadataRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              example: 'Sunset Beach'
            },
            description: {
              type: 'string',
              example: 'Beautiful sunset at the beach'
            },
            categoryIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['507f1f77bcf86cd799439011']
            }
          }
        },
        IncrementRequest: {
          type: 'object',
          properties: {
            incrementUsage: {
              type: 'integer',
              minimum: 0,
              example: 1
            },
            incrementFavorite: {
              type: 'integer',
              minimum: 0,
              example: 1
            }
          }
        },
        IncrementResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            image: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011'
                },
                countUsage: {
                  type: 'integer',
                  example: 151
                },
                countFavorite: {
                  type: 'integer',
                  example: 26
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      },
      {
        StaticTokenAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = specs;
