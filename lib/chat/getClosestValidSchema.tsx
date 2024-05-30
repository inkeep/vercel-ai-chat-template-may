import { z } from "zod"

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export function getClosestValidSchema<S extends z.Schema>(
  schema: S,
  obj: unknown
): z.infer<S> {
  const makeOptional = (s: z.Schema): z.Schema => {
    if (s instanceof z.ZodObject) {
      const updatedShape: Record<string, z.Schema> = {}
      for (const key in s.shape) {
        updatedShape[key] = makeOptional(s.shape[key])
      }
      return z.object(updatedShape).optional()
    } else if (s instanceof z.ZodArray) {
      return z.array(makeOptional(s.element)).optional()
    } else if (s instanceof z.ZodOptional) {
      return s
    } else {
      return s.optional()
    }
  }

  const optionalSchema = makeOptional(schema)

  const result = optionalSchema.parse(obj)

  const stripInvalidProperties = (obj: unknown, s: z.Schema): unknown => {
    if (s instanceof z.ZodObject) {
      const strippedObj: Record<string, unknown> = {}
      for (const key in obj as Record<string, unknown>) {
        const value = (obj as Record<string, unknown>)[key]
        const propertySchema = s.shape[key]
        if (propertySchema) {
          const strippedValue = stripInvalidProperties(value, propertySchema)
          if (strippedValue !== undefined) {
            strippedObj[key] = strippedValue
          }
        }
      }
      return strippedObj
    } else if (s instanceof z.ZodArray) {
      const array = obj as unknown[]
      if (Array.isArray(array)) {
        return array.map(item => stripInvalidProperties(item, s.element))
      } else {
        return undefined
      }
    } else {
      try {
        s.parse(obj)
        return obj
      } catch {
        return undefined
      }
    }
  }

  return stripInvalidProperties(result, schema) as z.infer<S>
}
