import mongoose from "mongoose";
import { generate9DigitId } from "../utils/numGen.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    shiprocketCategoryId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    handle: {
      type: String,
      required: true,
      maxlength: 100,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      validate: {
        validator: function (v) {
          // Prevent self-referencing
          return !v || v.toString() !== this._id.toString();
        },
        message: 'A category cannot be its own parent.',
      },
    },
    imageUrl: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    metaTitle: { type: String, maxlength: 255 },
    metaDescription: { type: String, maxlength: 500 },
    level: { type: Number, default: 0 },
    path: { type: String, default: "" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for child categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});


categorySchema.pre('validate', function () {
  if (!this.shiprocketCategoryId) {
    this.shiprocketCategoryId = generate9DigitId();
  }
  if (!this.handle && this.name) {
    this.handle = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

categorySchema.pre('save', async function () {
  if (this.isModified('parentId') || this.isModified('handle') || this.isNew) {
    if (!this.parentId) {
      this.level = 0;
      this.path = this.handle;
    } else {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = `${parent.path}/${this.handle}`;
      } else {
        this.level = 0;
        this.path = this.handle;
      }
    }
  }
});

categorySchema.index({ parentId: 1, isActive: 1, sortOrder: 1 });
categorySchema.index({ path: 1 });

export const Category = mongoose.model('Category', categorySchema);