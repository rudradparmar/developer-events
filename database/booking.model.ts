import {
  Document,
  Model,
  Schema,
  Types,
  model,
  models,
  type HookNextFunction,
} from "mongoose";
import Event from "./event.model";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => EMAIL_REGEX.test(value),
        message: "Invalid email format.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Index bookings by event for faster event-level lookups.
bookingSchema.index({ eventId: 1 });

bookingSchema.pre("save", async function preSave(next: HookNextFunction) {
  try {
    // Validate email format during save to block malformed records.
    if (!EMAIL_REGEX.test(this.email)) {
      throw new Error("Invalid email format.");
    }

    // Ensure booking references an existing event before persisting.
    if (this.isModified("eventId") || this.isNew) {
      const eventExists = await Event.exists({ _id: this.eventId });

      if (!eventExists) {
        throw new Error("Referenced event does not exist.");
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

const Booking = (models.Booking as Model<IBooking>) || model<IBooking>("Booking", bookingSchema);

export default Booking;
