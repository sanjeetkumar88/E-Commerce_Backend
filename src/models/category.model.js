import mongoose from "mongoose";
import { generate9DigitId } from "../utils/numGen.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
    },
    description: {
      type: String,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    imageUrl: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metaTitle: {
      type: String,
      maxlength: 255,
    },
    metaDescription: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.pre('save', function () {

  if (!this.shiprocketCategoryId) {
    this.shiprocketCategoryId = generate9DigitId();
  }
  if (!this.handle) {
    this.handle = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
});

export const Category = mongoose.model('Category', categorySchema);
