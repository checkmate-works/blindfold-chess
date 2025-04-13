import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { Toaster } from "react-hot-toast";

export const App = () => {
  return (
    <>
      <Toaster position="bottom-center" />
      <RouterProvider router={router} />
    </>
  );
};
