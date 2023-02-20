export const trending = (req, res) => res.send("Home Page Videos");
export const search = (req, res) => res.send("Search");
export const see = (req, res) => {
	return res.send(`See Video #${req.params.id}`);
};
export const edit = (req, res) => {
	return res.send("Edit");
};
export const upload = (req, res) => res.send("Upload");
export const deleteVideo = (req, res) => {
	return res.send("Delete Video");
};
