import User from "../models/User";
import Video from "../models/Video";
import fetch from "cross-fetch";
import bcrypt from "bcrypt";

export const getJoin = (req, res) =>
	res.render("users/join", {
		pageTitle: "Join",
	});

export const postJoin = async (req, res) => {
	console.log(req.body);
	const { name, username, email, password, password2, location } = req.body;
	const pageTitle = "Join";
	if (password !== password2) {
		req.flash("error", "Password confirmation does not match.");
		return res.status(400).render("users/join", {
			pageTitle,
			errorMessage: "Password confirmation does not match.",
		});
	}
	const exists = await User.exists({
		$or: [{ username }, { email }],
	});
	if (exists) {
		req.flash("error", "This username/email is already taken.");
		return res.status(400).render("users/join", {
			pageTitle,
			errorMessage: "This username/email is already taken.",
		});
	}
	try {
		await User.create({
			name,
			username,
			email,
			password,
			location,
		});
		req.flash("success", "Account created. Please log in.");
		return res.redirect("/login");
	} catch (error) {
		req.flash("error", error._message);
		return res.status(400).render("users/join", {
			pageTitle,
			errorMessage: error._message,
		});
	}
};

export const getLogin = (req, res) =>
	res.render("users/login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
	const pageTitle = "Login";
	const { username, password } = req.body;
	const user = await User.findOne({ username, socialOnly: false });
	if (!user) {
		req.flash("error", "An account with this username does not exists.");
		return res.status(400).render("users/login", {
			pageTitle,
			errorMessage: "An account with this username does not exists.",
		});
	}
	const ok = await bcrypt.compare(password, user.password);
	if (!ok) {
		req.flash("error", "Wrong password");
		return res.status(400).render("users/login", {
			pageTitle,
			errorMessage: "Wrong password",
		});
	}
	req.session.loggedIn = true;
	req.session.user = user;
	req.flash("success", "Welcome back!");
	return res.redirect("/");
};

export const startGithubLogin = (req, res) => {
	const baseUrl = "https://github.com/login/oauth/authorize";
	const config = {
		client_id: process.env.GH_CLIENT,
		allowSignup: false,
		scope: "read:user user:email",
	};
	const params = new URLSearchParams(config).toString();
	const finalUrl = `${baseUrl}?${params}`;
	return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
	const baseUrl = "https://github.com/login/oauth/access_token";
	const config = {
		client_id: process.env.GH_CLIENT,
		client_secret: process.env.GH_SECRET,
		code: req.query.code,
	};
	const params = new URLSearchParams(config).toString();
	const finalUrl = `${baseUrl}?${params}`;
	const tokenRequest = await (
		await fetch(finalUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
			},
		})
	).json();
	if ("access_token" in tokenRequest) {
		const { access_token } = tokenRequest;
		const apiUrl = "https://api.github.com";
		const userData = await (
			await fetch(`${apiUrl}/user`, {
				headers: {
					Authorization: `token ${access_token}`,
				},
			})
		).json();
		const emailData = await (
			await fetch(`${apiUrl}/user/emails`, {
				headers: {
					Authorization: `token ${access_token}`,
				},
			})
		).json();
		const emailObj = emailData.find(
			(email) => email.primary === true && email.verified === true
		);
		if (!emailObj) {
			req.flash("error", "Email verification failed.");
			return res.redirect("/login");
		}
		let user = await User.findOne({ email: emailObj.email });
		if (!user) {
			user = await User.create({
				avatarUrl: userData.avatar_url,
				name: userData.name ? userData.name : "Unknown",
				username: userData.login,
				email: emailObj.email,
				password: "",
				socialOnly: true,
				location: userData.location,
			});
		}
		req.session.loggedIn = true;
		req.session.user = user;
		req.flash("success", "Welcome!");
		return res.redirect("/");
	} else {
		req.flash("error", "Github login failed.");
		return res.redirect("/login");
	}
};

export const logout = (req, res) => {
	req.flash("info", "Bye bye");
	req.session.destroy();
	return res.redirect("/");
};

export const getEdit = (req, res) => {
	return res.render("users/edit-profile", { pageTitle: "Edit Profile" });
};
export const postEdit = async (req, res) => {
	const {
		session: {
			user: { _id, avatarUrl },
		},
		body: { name, email, username, location },
		file,
	} = req;
	const nameExists = await User.exists({ username });
	const emailExists = await User.exists({ email });
	const usernameChanged = req.session.user.username !== username;
	const emailChanged = req.session.user.email !== email;
	if (nameExists && usernameChanged) {
		req.flash("error", "This username is already taken.");
		return res.status(400).render("users/edit-profile", {
			pageTitle: "Edit Profile",
			errorMessage: "This username is already taken.",
		});
	}
	if (emailExists && emailChanged) {
		req.flash("error", "This email is already taken.");
		return res.status(400).render("users/edit-profile", {
			pageTitle: "Edit Profile",
			errorMessage: "This email is already taken.",
		});
	}

	const updatedUser = await User.findByIdAndUpdate(
		_id,
		{
			avatarUrl: file ? "..\\" + file.path : avatarUrl,
			name,
			email,
			username,
			location,
		},
		{ new: true }
	);
	req.session.user = updatedUser;
	req.flash("success", "Profile updated!");
	return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
	if (req.session.user.socialOnly === true) {
		req.flash("error", "Can't change password.");
		return res.redirect("/");
	}
	return res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
	const {
		session: {
			user: { _id },
		},
		body: { oldPassword, newPassword, newPasswordConfirmation },
	} = req;
	const user = await User.findById(_id);
	const ok = await bcrypt.compare(oldPassword, user.password);
	if (!ok) {
		req.flash("error", "The current password is incorrect");
		return res.status(400).render("users/change-password", {
			pageTitle: "Change Password",
			errorMessage: "The current password is incorrect",
		});
	}
	if (newPassword !== newPasswordConfirmation) {
		req.flash("error", "The password does not match the confirmation");
		return res.status(400).render("users/change-password", {
			pageTitle: "Change Password",
			errorMessage: "The password does not match the confirmation",
		});
	}
	user.password = newPassword;
	await user.save();
	req.flash("success", "Password updated!");
	return res.redirect("/users/logout");
};
export const see = async (req, res) => {
	const { id } = req.params;
	const user = await User.findById(id).populate({
		path: "videos",
		populate: {
			path: "owner",
			model: "User",
		},
	});
	if (!user) {
		req.flash("error", "User not found.");
		return res.status(404).render("404", { pageTitle: "User not found." });
	}

	return res.render("users/profile", {
		pageTitle: user.name,
		user,
	});
};
