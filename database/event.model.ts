import {
  Document,
  Model,
  Schema,
  model,
  models,
  type HookNextFunction,
} from "mongoose";

type EventMode = "online" | "offline" | "hybrid" | string;

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const nonEmptyString = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeDateToISO = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid event date.");
  }

  return parsed.toISOString();
};

const normalizeTime = (value: string): string => {
  const trimmed = value.trim();
  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)$/i);

  if (twelveHourMatch) {
    const hourRaw = Number(twelveHourMatch[1]);
    const minuteRaw = Number(twelveHourMatch[2] ?? "0");
    const period = twelveHourMatch[3].toLowerCase();

    if (hourRaw < 1 || hourRaw > 12 || minuteRaw < 0 || minuteRaw > 59) {
      throw new Error("Invalid event time.");
    }

    const hour24 = (hourRaw % 12) + (period === "pm" ? 12 : 0);
    return `${String(hour24).padStart(2, "0")}:${String(minuteRaw).padStart(2, "0")}`;
  }

  const twentyFourHourMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  throw new Error("Invalid event time.");
};

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length > 0 && value.every(nonEmptyString),
        message: "Agenda must contain at least one non-empty item.",
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length > 0 && value.every(nonEmptyString),
        message: "Tags must contain at least one non-empty item.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Keep slug unique and query-friendly.
eventSchema.index({ slug: 1 }, { unique: true });

eventSchema.pre("save", function preSave(next: HookNextFunction) {
  try {
    const requiredTextFields: Array<keyof Pick<
      IEvent,
      | "title"
      | "description"
      | "overview"
      | "image"
      | "venue"
      | "location"
      | "date"
      | "time"
      | "mode"
      | "audience"
      | "organizer"
    >> = [
      "title",
      "description",
      "overview",
      "image",
      "venue",
      "location",
      "date",
      "time",
      "mode",
      "audience",
      "organizer",
    ];

    for (const field of requiredTextFields) {
      if (!nonEmptyString(this[field])) {
        throw new Error(`Event field "${field}" is required.`);
      }
    }

    if (!Array.isArray(this.agenda) || this.agenda.length === 0 || !this.agenda.every(nonEmptyString)) {
      throw new Error('Event field "agenda" must contain non-empty strings.');
    }

    if (!Array.isArray(this.tags) || this.tags.length === 0 || !this.tags.every(nonEmptyString)) {
      throw new Error('Event field "tags" must contain non-empty strings.');
    }

    // Regenerate slug only when title changes.
    if (this.isModified("title")) {
      this.slug = toSlug(this.title);
    }

    // Normalize date and time to a consistent storage format.
    if (this.isModified("date")) {
      this.date = normalizeDateToISO(this.date);
    }

    if (this.isModified("time")) {
      this.time = normalizeTime(this.time);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

const Event = (models.Event as Model<IEvent>) || model<IEvent>("Event", eventSchema);

export default Event;
