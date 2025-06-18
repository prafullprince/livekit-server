"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCategoryAndSubCategory = exports.getSubCategoriesDetailsOfAllEvents = exports.getSubCategoriesDetails = exports.getCategoriesById = exports.getAllCategory = exports.createSubCategory = exports.createCategory = void 0;
const apiResponse_helper_1 = require("../helper/apiResponse.helper");
const category_models_1 = __importDefault(require("../models/category.models"));
const subcategory_models_1 = __importDefault(require("../models/subcategory.models"));
const mongoose_1 = __importDefault(require("mongoose"));
const event_models_1 = __importDefault(require("../models/event.models"));
const mediaUpload_helper_1 = require("../helper/mediaUpload.helper");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// createCategory
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { name } = req.body;
        // validation
        if (!name) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Please provide a name for the category");
        }
        // check if category already exists
        const category = yield category_models_1.default.findOne({ name: name });
        // validation
        if (category) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 409, "Category already exists");
        }
        // create category
        const data = yield category_models_1.default.create({
            name,
        });
        // return data
        return (0, apiResponse_helper_1.SuccessResponse)(res, 201, "Category created", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.createCategory = createCategory;
// createSubCategory
const createSubCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // fetch data
        const { name, about, categoryId } = req.body;
        // fetch imageUrl
        const imageUrl = (_a = req.files) === null || _a === void 0 ? void 0 : _a.imageUrl;
        // validation
        if (!name || !imageUrl || !about || !categoryId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Please provide all the required fields");
        }
        // check if category exists
        const categoryData = yield category_models_1.default.findOne({ _id: categoryId });
        // validation
        if (!categoryData) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Category does not exist");
        }
        // uplaed on cloudinary
        const imageFile = yield (0, mediaUpload_helper_1.thumbnailToCloudinary)(imageUrl, process.env.FOLDER_NAME);
        if (!imageFile) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "upload failed");
        }
        // check if subcategory already exists
        const subCategory = yield subcategory_models_1.default.findOne({ name: name });
        // validation
        if (subCategory) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 409, "Subcategory already exists");
        }
        // create subcategory
        const data = yield subcategory_models_1.default.create({
            name,
            imageUrl: imageFile.secure_url,
            about,
            category: categoryData._id,
        });
        // updateCategory
        const updatedCategory = yield category_models_1.default.findOneAndUpdate({ _id: categoryData._id }, { $push: { subCategories: data._id } }, { new: true });
        // return data
        return (0, apiResponse_helper_1.SuccessResponse)(res, 201, "Subcategory created", {
            data,
            updatedCategory,
        });
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.createSubCategory = createSubCategory;
// getAllCategories
const getAllCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield category_models_1.default.find({});
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Category fetched", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.getAllCategory = getAllCategory;
// getSubCategoriesById
const getCategoriesById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { categoryId } = req.body;
        // validation
        if (!categoryId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Please provide a category id");
        }
        // isCategoryExist
        const isCategory = yield category_models_1.default.findOne({ _id: categoryId });
        // validation
        if (!isCategory) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Category does not exist");
        }
        // find allSubCategories of this category
        const data = yield subcategory_models_1.default.find({ category: categoryId });
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Subcategory fetched by id", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.getCategoriesById = getCategoriesById;
// getSubCategoriesDetails
const getSubCategoriesDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { subCategoryId } = req.body;
        // validation
        if (!subCategoryId) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Please provide a sub category id");
        }
        // isSubCategoryExist
        const isSubCategory = yield subcategory_models_1.default.findOne({ _id: subCategoryId });
        // validation
        if (!isSubCategory) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Subcategory does not exist");
        }
        // top10 most rated Events in this category
        // most popular Events in this category
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Subcategory fetched by id", null);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.getSubCategoriesDetails = getSubCategoriesDetails;
// getSubCategoriesDetails of all events registered in this category by infinite scroll
const getSubCategoriesDetailsOfAllEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetch data
        const { cursor, limit = 10 } = req.query;
        const subCategoryId = req.body.subCategoryId;
        const limitNumber = parseInt(limit, 10);
        // validation
        if (isNaN(limitNumber) || limitNumber < 1 || !subCategoryId) {
            return res.status(400).json({ message: "Invalid pagination parameters" });
        }
        // isSubCategoryExist
        const isSubCategory = yield subcategory_models_1.default.findOne({ _id: subCategoryId })
            .select("events")
            .lean();
        // validation
        if (!isSubCategory) {
            return (0, apiResponse_helper_1.ErrorResponse)(res, 404, "Subcategory does not exist");
        }
        // make query
        const query = { _id: { $in: isSubCategory.events } }; // on first api call it returns 10 events of top and then on next api call it returns next 10 events which is $lt cursor
        // make cursor
        if (cursor) {
            if (mongoose_1.default.isValidObjectId(cursor)) {
                query["_id"] = { $lt: new mongoose_1.default.Types.ObjectId(cursor) };
            }
            else {
                return res.status(400).json({ message: "Invalid cursor" });
            }
        }
        // filter all events
        const data = yield event_models_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNumber);
        // validation
        if (data.length === 0) {
            return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "no events remained", []);
        }
        // hasmore
        const hasmore = data.length === limitNumber;
        const nextCursor = data.length > 0 ? data[data.length - 1]._id : null;
        // return data
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Subcategory fetched by id", {
            pagination: {
                hasmore,
                nextCursor,
                data,
            },
        });
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.getSubCategoriesDetailsOfAllEvents = getSubCategoriesDetailsOfAllEvents;
// fetchCategoryAndSubCategory
const fetchCategoryAndSubCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // fetchData
        const data = yield category_models_1.default.find({}).populate({
            path: "subCategories",
            select: "_id name imageUrl about",
        });
        return (0, apiResponse_helper_1.SuccessResponse)(res, 200, "Category and Subcategory fetched", data);
    }
    catch (error) {
        console.log(error);
        return (0, apiResponse_helper_1.ErrorResponse)(res, 500, "Internal server error");
    }
});
exports.fetchCategoryAndSubCategory = fetchCategoryAndSubCategory;
