const { Router } = require("express");
const { uploadAlbum, fetchAlbums, viewAlbum } = require("../controllers/galleryController");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const galleryRouter = Router();

// Authentication is required for all gallery routes
galleryRouter.use(authentication);

// Upload album
galleryRouter.route("/album")
.post(authorization(["business"]), uploadAlbum);

// View album
galleryRouter.route("/album/:albumId")
.get(authorization(["business", "user"]), viewAlbum);

// Fetch albums
galleryRouter.route("/albums/:businessProfileId")
.get(authorization(["business"]), fetchAlbums);

module.exports = galleryRouter;