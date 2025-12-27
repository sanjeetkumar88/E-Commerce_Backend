import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ProductVariant } from "../models/productVariant.js";
import { ApiError } from "../utils/ApiError.js";
import { ProductImage } from "../models/productImage.model.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";
import { Category } from "../models/category.model.js";



/* -------------------------------------------------------------------------- */
/*                            HELPER: UPLOAD IMAGES                             */
/* -------------------------------------------------------------------------- */
const uploadImages = async (files, productId, variantId = null) => {
  const uploadedImages = [];

  if (!files?.length) return uploadedImages;

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer, `products/${productId}/${file.originalname}`);

    const imgDoc = await ProductImage.create({
      imageUrl: result.secure_url,
      public_id: result.public_id,
      productId,
      variantId,
    });

    uploadedImages.push(imgDoc);
  }

  return uploadedImages;
};

/* -------------------------------------------------------------------------- */
/*                               CREATE PRODUCT                                */
/* -------------------------------------------------------------------------- */
export const createProduct = async (productData, files) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

  try {
    const { variants, ...productDetail } = productData;

    // Check duplicate product
    const existingProduct = await Product.findOne(
      { name: productDetail.name, isDeleted: false },
      null,
    );
    if (existingProduct) {
      throw new ApiError(409, "Product with this name already exists");
    }

    // Create product
    const [createdProduct] = await Product.create(
      [{ ...productDetail, isDeleted: false, soldCount: 0 }],
    );

    // Separate product images and variant images
    const productImages = files?.filter(f => f.fieldname === "images");
    const variantFiles = files?.filter(f => f.fieldname.startsWith("variantImages"));

    // Upload main product images
    let createdProductImages = [];
    if (productImages?.length) {
      createdProductImages = await uploadImages(productImages, createdProduct._id);
    }

    // Create variants and upload their images
    let createdVariants = [];
    let variantImages = [];
    if (variants?.length) {
      for (const [index, v] of variants.entries()) {
        const variantFileGroup = variantFiles?.filter(f => f.fieldname === `variantImages[${index}]`) || [];
        
        
        // Create variant
        const [createdVariant] = await ProductVariant.create(
          [{ ...v, productId: createdProduct._id }],
        );
        createdVariants.push(createdVariant);

        // Upload variant images
        if (variantFileGroup.length) {
          const uploaded = await uploadImages(variantFileGroup, createdProduct._id, createdVariant._id);
          variantImages.push(...uploaded);
        }
      }
    }

    // await session.commitTransaction();
    // session.endSession();

    return {
      ...createdProduct.toObject(),
      variants: createdVariants,
      productImages: createdProductImages,
      variantImages,
    };
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    throw error;
  }
};


/* -------------------------------------------------------------------------- */
/*                          LIST / SEARCH PRODUCTS                              */
/* -------------------------------------------------------------------------- */



export const getAllProducts = async ({
  page = 1,
  limit = 20,
  search,
  brand,
  minPrice,
  maxPrice,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const filter = {
    isDeleted: false,
    isActive: true,
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  if (brand) filter.brand = brand;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = minPrice;
    if (maxPrice) filter.price.$lte = maxPrice;
  }

  const products = await Product.find(filter)
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "categoryId",
      select: "name slug",
    });

  const total = await Product.countDocuments(filter);

  return {
    data: products.map(p => ({
      ...p.toObject(),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};



/* -------------------------------------------------------------------------- */
/*                               UPDATE PRODUCT                                */
/* -------------------------------------------------------------------------- */

export const updateProduct = async (productId, updateData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { variants, ...productFields } = updateData;

    // Allowed product fields
    const allowedFields = [
      "name",
      "description",
      "shortDescription",
      "price",
      "discountedPrice",
      "brand",
      "stockQuantity",
      "tags",
      "categoryId",
      "isFeatured",
      "isActive",
      "status",
    ];

    const filteredData = Object.fromEntries(
      Object.entries(productFields).filter(([key]) =>
        allowedFields.includes(key)
      )
    );

    // Update product
    const product = await Product.findOneAndUpdate(
      { _id: productId, isDeleted: false },
      filteredData,
      { new: true, runValidators: true, session }
    );

    if (!product) throw new ApiError(404, "Product not found");

    // Update or create variants if provided
    let updatedVariants = [];
    if (variants?.length) {
      for (const v of variants) {
        if (v._id) {
          // Update existing variant
          const updated = await ProductVariant.findOneAndUpdate(
            { _id: v._id, productId },
            v,
            { new: true, session }
          );
          if (updated) updatedVariants.push(updated);
        } else {
          // Create new variant
          const created = await ProductVariant.create([{
            ...v,
            productId
          }], { session });
          updatedVariants.push(created[0]);
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      ...product.toObject(),
      variants: updatedVariants,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*                               DELETE PRODUCT (SOFT)                          */
/* -------------------------------------------------------------------------- */

export const deleteProduct = async (productId) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

/* -------------------------------------------------------------------------- */
/*                            STOCK MANAGEMENT                                  */
/* -------------------------------------------------------------------------- */

export const updateProductStock = async (productId, quantity) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock + quantity < 0) {
    throw new ApiError(400, "Insufficient stock");
  }

  product.stock += quantity;
  await product.save();

  return product;
};

/* -------------------------------------------------------------------------- */
/*                           PRICE MANAGEMENT                                   */
/* -------------------------------------------------------------------------- */

export const updateProductPrice = async (
  productId,
  price,
  discountedPrice
) => {
  if (discountedPrice && discountedPrice >= price) {
    throw new ApiError(400, "Discounted price must be less than price");
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, isDeleted: false },
    { price, discountedPrice },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

/* -------------------------------------------------------------------------- */
/*                           SOLD COUNT UPDATE                                  */
/* -------------------------------------------------------------------------- */

export const incrementSoldCount = async (productId, quantity) => {
  return Product.findByIdAndUpdate(
    productId,
    {
      $inc: { soldCount: quantity },
      $inc: { stock: -quantity },
    },
    { new: true }
  );
};

/* -------------------------------------------------------------------------- */
/*                           FEATURED / POPULAR                                  */
/* -------------------------------------------------------------------------- */

export const getFeaturedProducts = async (limit = 10) => {
  return Product.find({
    isFeatured: true,
    isActive: true,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getPopularProducts = async () => {
  return Product.find({
    isActive: true,
    isDeleted: false,
  })
    .sort({ soldCount: -1 })
    .limit(10);
};

export const getNewArrivals = async () => {
  return Product.find({
    isActive: true,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(10);
};





