"use client";
import { BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import axios from "axios";
import { useState } from "react";

export function UploadImage({
  onImageAdded,
  image,
}: {
  onImageAdded: (image: string) => void;
  image?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function onFileSelect(e: any) {
    setUploading(true);
    try {
      const file = e.target.files[0];
      const response = await axios.get(`${BACKEND_URL}/v1/user/presignedUrl`, {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      const presignedUrl = response.data.preSignedUrl;
      const formData = new FormData();
      formData.set("bucket", response.data.fields["bucket"]);
      formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
      formData.set(
        "X-Amz-Credential",
        response.data.fields["X-Amz-Credential"],
      );
      formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
      formData.set("X-Amz-Date", response.data.fields["X-Amz-Date"]);
      formData.set("key", response.data.fields["key"]);
      formData.set("Policy", response.data.fields["Policy"]);
      formData.set("X-Amz-Signature", response.data.fields["X-Amz-Signature"]);
      formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
      formData.append("file", file);
      const awsResponse = await axios.post(presignedUrl, formData);

      onImageAdded(`${CLOUDFRONT_URL}/${response.data.fields["key"]}`);
    } catch (e) {
      console.log(e);
    }
    setUploading(false);
  }

  if (image) {
    return (
      <img
        className="p-2 w-96 rounded shadow-lg transition-transform duration-300 ease-in-out hover:scale-105"
        src={image}
      />
    );
  }

  return (
    <div>
      <div className="w-40 h-40 rounded border-2 border-dashed border-gray-400 text-2xl cursor-pointer hover:border-blue-500 transition-all duration-300 ease-in-out">
        <div className="h-full flex justify-center items-center relative w-full">
          {uploading ? (
            <div className="text-sm animate-pulse">Loading...</div>
          ) : (
            <>
              <span className="text-4xl">+</span>
              <input
                className="absolute inset-0 opacity-0 cursor-pointer"
                type="file"
                onChange={onFileSelect}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
