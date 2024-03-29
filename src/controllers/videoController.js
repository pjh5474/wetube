import User from "../models/User";
import Video from "../models/Video";
import Comment from "../models/Comment";

export const home = async (req, res) => {
	try {
		const videos = await Video.find({})
			.sort({ createdAt: "desc" })
			.populate("owner");
		return res.render("home", { pageTitle: "Home", videos });
	} catch (error) {
		req.flash("error", "Server error.");
		return res.render("server-error");
	}
};
export const watch = async (req, res) => {
	const { id } = req.params;
	const video = await Video.findById(id).populate("owner").populate("comments");
	if (!video) {
		req.flash("error", "Video not found.");
		return res.status(404).render("404", { pageTitle: "Video not found." });
	}
	return res.render("videos/watch", { pageTitle: video.title, video });
};
export const getEdit = async (req, res) => {
	const { id } = req.params;
	const {
		user: { _id },
	} = req.session;
	const video = await Video.findById(id);
	if (!video) {
		req.flash("error", "Video not found.");
		return res.status(404).render("404", { pageTitle: "Video not found." });
	}
	if (String(video.owner) !== String(_id)) {
		req.flash("error", "You are not the owner of the video.");
		return res.status(403).redirect("/");
	}
	return res.render("videos/edit", { pageTitle: `Edit ${video.title}`, video });
};

export const postEdit = async (req, res) => {
	const {
		user: { _id },
	} = req.session;
	const { id } = req.params;
	const { title, description, hashtags } = req.body;
	const video = await Video.findById(id);
	if (!video) {
		return res.status(404).render("404", { pageTitle: "Video not found." });
	}
	console.log("video:", video);
	console.log(_id);
	if (String(video.owner) !== String(_id)) {
		req.flash("error", "You are not the owner of the video.");
		return res.status(403).redirect("/");
	}
	await Video.findByIdAndUpdate(id, {
		title,
		description,
		hashtags: Video.formatHashtags(hashtags),
	});
	req.flash("success", "Changes saved");
	return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
	return res.render("videos/upload", { pageTitle: "Upload Video" });
};

export const postUpload = async (req, res) => {
	const {
		session: {
			user: { _id },
		},
		files: { video, thumb },
		body: { title, description, hashtags },
	} = req;
	const isFly = process.env.NODE_ENV === "production";
	try {
		const newVideo = await Video.create({
			title,
			description,
			fileUrl: Video.changePathFormula(
				isFly ? video[0].location : video[0].path
			),
			thumbUrl: Video.changePathFormula(
				isFly ? thumb[0].location : thumb[0].path
			),
			hashtags: Video.formatHashtags(hashtags),
			owner: _id,
		});
		const user = await User.findById(_id);
		user.videos.push(newVideo._id);
		user.save();
		req.flash("success", "Uploaded successfully");
		return res.redirect("/");
	} catch (error) {
		req.flash("error", error._message);
		return res.status(400).render("videos/upload", {
			pageTitle: "Upload Video",
			errorMessage: error._message,
		});
	}
};

export const deleteVideo = async (req, res) => {
	const {
		user: { _id },
	} = req.session;
	const { id } = req.params;
	const video = await Video.findById(id);
	if (String(video.owner) !== String(_id)) {
		return res.status(403).redirect("/");
	}
	await Video.findByIdAndDelete(id);
	req.flash("info", "Deleted successfully");
	return res.redirect("/");
};

export const search = async (req, res) => {
	const { keyword } = req.query;
	let videos = [];
	if (keyword) {
		videos = await Video.find({
			title: {
				$regex: new RegExp(`${keyword}`, "i"),
			},
		}).populate("owner");
	}
	return res.render("videos/search", { pageTitle: "Search", videos });
};

export const registerView = async (req, res) => {
	const { id } = req.params;
	const video = await Video.findById(id);
	if (!video) {
		req.flash("error", "Video not found");
		return res.sendStatus(404);
	}
	video.meta.views = video.meta.views + 1;
	await video.save();
	return res.sendStatus(200);
};

export const createComment = async (req, res) => {
	const {
		params: { id: videoId },
		body: { text },
		session: {
			user: { _id: userId },
		},
	} = req;

	const video = await Video.findById(videoId);
	if (!video) {
		req.flash("error", "Video not found");
		return res.sendStatus(404);
	}

	const comment = await Comment.create({
		text,
		owner: userId,
		video: videoId,
	});
	video.comments.push(comment._id);
	video.save();

	return res.status(201).json({ newCommentId: comment._id });
};

export const deleteComment = async (req, res) => {
	const {
		params: { id: commentId },
		session: {
			user: { _id: userId },
		},
	} = req;

	const comment = await Comment.findById(commentId);
	if (!comment) {
		req.flash("error", "Comment not found");
		return res.sendStatus(404);
	}

	if (String(comment.owner) !== String(userId)) {
		req.flash("error", "Not authorized");
		return res.sendStatus(403);
	}

	const video = await Video.findById(comment.video);
	const commentIndex = video.comments.indexOf(commentId);
	video.comments.splice(commentIndex, 1);
	video.save();

	// delete comment
	await Comment.findByIdAndDelete(commentId);
	return res.sendStatus(200);
};
