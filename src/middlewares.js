import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
	credentials: {
		accessKeyId: process.env.AWS_ID,
		secretAccessKey: process.env.AWS_SECRET,
	},
	region: "ap-northeast-2",
});

const isFly = process.env.NODE_ENV === "production";

const multerVideoUploader = multerS3({
	s3: s3,
	bucket: "wartube2023",
	acl: "public-read",
	contentType: multerS3.AUTO_CONTENT_TYPE,
	key: function (request, file, ab_callback) {
		const newFileName = Date.now() + "-" + file.originalname;
		const fullPath = "videos/" + newFileName;
		ab_callback(null, fullPath);
	},
});

const multerImageUploader = multerS3({
	s3: s3,
	bucket: "wartube2023",
	acl: "public-read",
	key: function (request, file, ab_callback) {
		const newFileName = Date.now() + "-" + file.originalname;
		const fullPath = "images/" + newFileName;
		ab_callback(null, fullPath);
	},
});

export const localsMiddleware = (req, res, next) => {
	res.locals.loggedIn = Boolean(req.session.loggedIn);
	res.locals.siteName = "Wetube";
	res.locals.loggedInUser = req.session.user || {};
	res.locals.isFly = isFly;
	next();
};

export const protectorMiddleware = (req, res, next) => {
	if (req.session.loggedIn) {
		next();
	} else {
		req.flash("error", "Login first");
		return res.redirect("/login");
	}
};

export const publicOnlyMiddleware = (req, res, next) => {
	if (!req.session.loggedIn) {
		next();
	} else {
		req.flash("error", "Not authorized");
		return res.redirect("/");
	}
};

export const avatarUpload = multer({
	dest: "uploads/avatars/",
	limits: {
		fileSize: 3000000,
	},
	storage: isFly ? multerImageUploader : undefined,
});

export const videoUpload = multer({
	dest: "uploads/videos/",
	limits: {
		fileSize: 10000000,
	},
	storage: isFly ? multerVideoUploader : undefined,
});

export const avatardeleteMiddleware = async (req, res, next) => {
	if (!req.file) {
		return next();
	}
	if (!req.session.user.avatarUrl) {
		return next();
	}

	if (!isFly) {
		console.log("Not Fly");
		return next();
	}
	const key = `images/${req.session.user.avatarUrl.split("/")[4]}`;
	const params = {
		Bucket: "wartube2023",
		Key: key,
	};
	try {
		const data = await s3.send(new DeleteObjectCommand(params));
		console.log("Success. Object deleted.", data);
	} catch (err) {
		console.log("Error", err);
		return res.redirect("/user/edit");
	}
	next();
};
