import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { Toaster } from "react-hot-toast";
import "@/i18n/config";

export const App = () => {
  return (
    <>
      <Toaster position="bottom-center" />
      <RouterProvider router={router} />
    </>
  );
};
