import ReactDOM from "react-dom/client";
import "./styles.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Editor, { loader } from "./components/Editor";
import Login from "./Login";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/editor/:noteId",
    element: <Editor />,
    loader: loader as unknown as any, // INFO: fixes build issue.
  },
]);
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={router}></RouterProvider>
);
