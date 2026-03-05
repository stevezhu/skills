import { Type, type Static } from 'typebox';

const IsoDate = Type.Codec(Type.String({ format: 'date-time' }))
  .Decode((value) => new Date(value))
  .Encode((value) => value.toISOString());

/**
 * TypeBox schema for agent logbook frontmatter.
 */
export const FrontmatterSchema = Type.Object(
  {
    date: IsoDate,
    type: Type.Union([
      Type.Literal('activity'),
      Type.Literal('research'),
      Type.Literal('decision'),
      Type.Literal('plan'),
    ]),
    status: Type.Union([
      Type.Literal('complete'),
      Type.Literal('in-progress'),
      Type.Literal('abandoned'),
      Type.Literal('success'),
      Type.Literal('failure'),
      Type.Literal('partial'),
    ]),
    agent: Type.String({ minLength: 1 }),
    branch: Type.String({ minLength: 1 }),
    models: Type.Array(Type.String(), { minItems: 1 }),
    // Optional fields
    sessionId: Type.Optional(Type.String()),
    taskId: Type.Optional(Type.String()),
    cost: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    filesModified: Type.Optional(Type.Array(Type.String())),
    relatedPlan: Type.Optional(Type.String()),
    migrated: Type.Optional(Type.Boolean()),
  },
  {
    additionalProperties: false,
  },
);

export type Frontmatter = Static<typeof FrontmatterSchema>;
