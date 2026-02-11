const { emptyList } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const Gallery = require("../models/galleryModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { galleryValidationSchema } = require("../validations/businessProfileVaidator");

// Upload album to gallery
const uploadAlbum = asyncHandler(async (request, response) => {
    const businessProfileId = request.user.profiles?.businessProfileId;

    // Validate request body
    const { albumName, description, images } = validate(galleryValidationSchema, request.body);

    // Create new album
    const gallery = await Gallery.create({ businessProfileId, albumName, description, images });
    if(!gallery) throw new ApiError(500, "Unable to upload album");

    // Response
    return response.status(201).json(new ApiResponse(201, { albumName, description, images }, "Album uploaded successfully"));
});

// Fetch albums for a business profile
const fetchAlbums = asyncHandler(async (request, response) => {
    // Get business profile ID
    const { businessProfileId } = request.params;

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select: "albumName description images createdAt",
        sort: { createdAt: -1 }
    };

    // Fetch albums
    const albums = await Gallery.paginate({ businessProfileId }, options);
    if(!albums.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No albums found"));

    // Response
    return response.status(200).json(new ApiResponse(200, albums, "Albums fetched successfully"));
});

// View album
const viewAlbum = asyncHandler(async (request, response) => {
    const { albumId } = request.params;

    // Fetch album
    const album = await Gallery.findById(albumId).select("albumName description images createdAt");
    if(!album) throw new ApiError(404, "Album not found");

    // Response
    return response.status(200).json(new ApiResponse(200, album, "Album fetched successfully"));
});

module.exports = { uploadAlbum, fetchAlbums, viewAlbum };