import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "../helper/apiResponse.helper";
import Category from "../models/category.models";
import SubCategory from "../models/subcategory.models";
import mongoose from "mongoose";
import Event from "../models/event.models";
import fileUpload, { UploadedFile } from "express-fileupload";
import { thumbnailToCloudinary } from "../helper/mediaUpload.helper";
import dotenv from "dotenv";
dotenv.config();

// createCategory
export const createCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // fetch data
    const { name } = req.body;

    // validation
    if (!name) {
      return ErrorResponse(res, 404, "Please provide a name for the category");
    }

    // check if category already exists
    const category = await Category.findOne({ name: name });

    // validation
    if (category) {
      return ErrorResponse(res, 409, "Category already exists");
    }

    // create category
    const data = await Category.create({
      name,
    });

    // return data
    return SuccessResponse(res, 201, "Category created", data);
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// createSubCategory
export const createSubCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // fetch data
    const { name, about, categoryId } = req.body;

    // fetch imageUrl
    const imageUrl = req.files?.imageUrl as UploadedFile;
    // validation
    if (!name || !imageUrl || !about || !categoryId) {
      return ErrorResponse(res, 404, "Please provide all the required fields");
    }

    // check if category exists
    const categoryData = await Category.findOne({ _id: categoryId });

    // validation
    if (!categoryData) {
      return ErrorResponse(res, 404, "Category does not exist");
    }

    // uplaed on cloudinary
    const imageFile = await thumbnailToCloudinary(
      imageUrl,
      process.env.FOLDER_NAME
    );
    if (!imageFile) {
      return ErrorResponse(res, 404, "upload failed");
    }

    // check if subcategory already exists
    const subCategory = await SubCategory.findOne({ name: name });

    // validation
    if (subCategory) {
      return ErrorResponse(res, 409, "Subcategory already exists");
    }

    // create subcategory
    const data = await SubCategory.create({
      name,
      imageUrl: imageFile.secure_url,
      about,
      category: categoryData._id,
    });

    // updateCategory
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryData._id },
      { $push: { subCategories: data._id } },
      { new: true }
    );

    // return data
    return SuccessResponse(res, 201, "Subcategory created", {
      data,
      updatedCategory,
    });
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// getAllCategories
export const getAllCategory = async (req: Request, res: Response) => {
  try {
    const data = await Category.find({});

    return SuccessResponse(res, 200, "Category fetched", data);
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// getSubCategoriesById
export const getCategoriesById = async (req: Request, res: Response) => {
  try {
    // fetch data
    const { categoryId } = req.body;

    // validation
    if (!categoryId) {
      return ErrorResponse(res, 404, "Please provide a category id");
    }

    // isCategoryExist
    const isCategory = await Category.findOne({ _id: categoryId });

    // validation
    if (!isCategory) {
      return ErrorResponse(res, 404, "Category does not exist");
    }

    // find allSubCategories of this category
    const data = await SubCategory.find({ category: categoryId });

    return SuccessResponse(res, 200, "Subcategory fetched by id", data);
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// getSubCategoriesDetails
export const getSubCategoriesDetails = async (req: Request, res: Response) => {
  try {
    // fetch data
    const { subCategoryId } = req.body;

    // validation
    if (!subCategoryId) {
      return ErrorResponse(res, 404, "Please provide a sub category id");
    }

    // isSubCategoryExist
    const isSubCategory = await SubCategory.findOne({ _id: subCategoryId });

    // validation
    if (!isSubCategory) {
      return ErrorResponse(res, 404, "Subcategory does not exist");
    }

    // top10 most rated Events in this category

    // most popular Events in this category

    return SuccessResponse(res, 200, "Subcategory fetched by id", null);
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// getSubCategoriesDetails of all events registered in this category by infinite scroll
export const getSubCategoriesDetailsOfAllEvents = async (
  req: Request,
  res: Response
) => {
  try {
    // fetch data
    const { cursor, limit = 10 } = req.query;
    const subCategoryId = req.body.subCategoryId;
    const limitNumber = parseInt(limit as string, 10);

    // validation
    if (isNaN(limitNumber) || limitNumber < 1 || !subCategoryId) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }

    // isSubCategoryExist
    const isSubCategory = await SubCategory.findOne({ _id: subCategoryId })
      .select("events")
      .lean();

    // validation
    if (!isSubCategory) {
      return ErrorResponse(res, 404, "Subcategory does not exist");
    }

    // make query
    const query: any = { _id: { $in: isSubCategory.events } }; // on first api call it returns 10 events of top and then on next api call it returns next 10 events which is $lt cursor

    // make cursor
    if (cursor) {
      if (mongoose.isValidObjectId(cursor)) {
        query["_id"] = { $lt: new mongoose.Types.ObjectId(cursor as string) };
      } else {
        return res.status(400).json({ message: "Invalid cursor" });
      }
    }

    // filter all events
    const data = await Event.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNumber);

    // validation
    if (data.length === 0) {
      return SuccessResponse(res, 200, "no events remained", []);
    }

    // hasmore
    const hasmore = data.length === limitNumber;
    const nextCursor = data.length > 0 ? data[data.length - 1]._id : null;

    // return data
    return SuccessResponse(res, 200, "Subcategory fetched by id", {
      pagination: {
        hasmore,
        nextCursor,
        data,
      },
    });
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};

// fetchCategoryAndSubCategory
export const fetchCategoryAndSubCategory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // fetchData
    const data = await Category.find({}).populate({
      path: "subCategories",
      select: "_id name imageUrl about",
    });

    return SuccessResponse(res, 200, "Category and Subcategory fetched", data);
  } catch (error) {
    console.log(error);
    return ErrorResponse(res, 500, "Internal server error");
  }
};
