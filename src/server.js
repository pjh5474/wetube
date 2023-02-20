import express from "express";

const PORT = 4000;
const app = express();

const pathLogger = (req, res, next) => {
	console.log("PATH", req.path);
	next();
};
const methodLogger = (req, res, next) => {
	console.log("METHOD", req.method);
	next();
};

app.use(methodLogger, pathLogger);
app.get("/", (req, res) => res.send("I love middlewares"));

const handleListening = () => {
	console.log(`✅ Server listening on port http://localhost:${PORT} 🚀`);
};
app.listen(PORT, handleListening);
