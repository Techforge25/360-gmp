const { Router } = require("express");
const { uploadAlbum, fetchAlbums, viewAlbum, 
deleteAlbum, updateAlbum } = require("../controllers/galleryController");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const galleryRouter = Router();

// Authentication is required for all gallery routes
galleryRouter.use(authentication);

// Upload album
galleryRouter.route("/album")
.post(authorization(["business"]), uploadAlbum);

// Fetch all albums of a business profile
galleryRouter.route("/albums/:businessProfileId")
.get(authorization(["business", "user"]), fetchAlbums);

// View album / Update album / Delete album
galleryRouter.route("/album/:albumId")
.get(authorization(["business", "user"]), viewAlbum)
.patch(authorization(["business", "user"]), updateAlbum)
.delete(authorization(["business"]), deleteAlbum);

module.exports = galleryRouter;