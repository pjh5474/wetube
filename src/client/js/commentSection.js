const videoContainer = document.getElementById("videoContainer");
const form = document.getElementById("commentForm");
const deleteSpan = document.querySelectorAll(".delete__comment");

const deleteComment = async (event) => {
	const comment = event.target.parentNode;
	const commentId = comment.dataset.id;
	console.log(comment);
	await fetch(`/api/comments/${commentId}/delete`, {
		method: "DELETE",
	});
	comment.remove();
};

const addComment = (text, newCommentId) => {
	const videoComments = document.querySelector(".video__comments ul");
	const newComment = document.createElement("li");
	newComment.className = "video__comment";
	newComment.dataset.id = newCommentId;
	const icon = document.createElement("i");
	icon.className = "fas fa-comment";
	const span = document.createElement("span");
	span.innerText = ` ${text}`;
	const deleteSpan = document.createElement("span");
	deleteSpan.className = "delete__comment";
	deleteSpan.innerText = "❌";
	deleteSpan.addEventListener("click", deleteComment);
	newComment.appendChild(icon);
	newComment.appendChild(span);
	newComment.appendChild(deleteSpan);
	videoComments.prepend(newComment);
};

const handleSubmit = async (event) => {
	event.preventDefault();
	const textarea = form.querySelector("textarea");
	const text = textarea.value;
	const videoId = videoContainer.dataset.id;
	if (text === "") {
		return;
	}
	const response = await fetch(`/api/videos/${videoId}/comment`, {
		method: "POST",
		body: JSON.stringify({ text }),
		headers: {
			"Content-Type": "application/json",
		},
	});
	textarea.value = "";
	if (response.status === 201) {
		const { newCommentId } = await response.json();
		addComment(text, newCommentId);
	}
};

if (form) {
	form.addEventListener("submit", handleSubmit);
	deleteSpan.forEach((span) => {
		span.addEventListener("click", deleteComment);
	});
}
