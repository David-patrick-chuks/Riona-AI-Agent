type JsonSchema = {
  description?: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  nullable?: boolean;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

export type InstagramCommentSchema = JsonSchema;

export const getInstagramCommentSchema = (): InstagramCommentSchema => {
  const itemSchema: JsonSchema = {
    type: 'object',
    properties: {
      comment: {
        type: 'string',
        description: 'A comment between 150 and 250 characters.',
        nullable: false,
      },
      viralRate: {
        type: 'number',
        description: 'The viral rate, measured on a scale of 0 to 100.',
        nullable: false,
      },
      commentTokenCount: {
        type: 'number',
        description: 'The total number of tokens in the comment.',
        nullable: false,
      },
    },
    required: ['comment', 'viralRate', 'commentTokenCount'],
  };

  const schema: JsonSchema = {
    description: `Lists comments that are engaging and have the potential to attract more likes and go viral.`,
    type: 'array',
    items: itemSchema,
  };

  return schema;
};
