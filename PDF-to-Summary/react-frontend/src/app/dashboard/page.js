"use client";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import logo from "@/images/logo.png";

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [Summary, setSummary] = useState([]);
  const [error, setError] = useState("");
  console.log(Summary);

  const { push } = useRouter();

  const [userPrompt, setUserPrompt] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("Token")) {
      localStorage.clear();
      push("/");
    }
    const difference = Date.now() - localStorage.getItem("Token");
    console.log(difference);
    if (difference > 3600000) {
      localStorage.clear();
      push("/");
    }
  }, [push]);

  const fileAccepted = (event) => {
    const selectedFile = event.target.files[0];
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, DOCX, or TXT file");
      setFileName("");
      setFile(null);
      return;
    }
    setFileName(selectedFile.name);
    setFile(selectedFile);
    setError("");
  };

  const anotherSummary = () => {
    setSummary([]);
    setFile(null);
    setFileName("");
    setError("");
    setLoading(false);
  };

  const handleResponse = (data, isError) => {
    if (isError) {
      setSummary([...Summary, {
        userPrompt: userPrompt,
        summary: `<div className="bg-red-100 border border-red-400 text-red-700 px-4 rounded relative"><strong className="font-bold text-red-700">Error Occurred:</strong><br/><span className="block sm:inline">${data.error}</span></div>`,
      }]);
    } else {
      const boldRegex = /\*\*(.*?)\*\*/g;
      const formattedText = data.replace(boldRegex, "<b>$1</b>");
      const listRegex = /^\*(.*$)/gm;
      const replacedText = formattedText.replace(listRegex, "<li>$1</li>");

      setSummary([...Summary, {
        userPrompt: userPrompt,
        summary: replacedText,
      }]);
    }
    setUserPrompt("");
    setLoading(false);
  };

  const generateSummary = () => {
    if (!file) {
      setError("Please upload a file");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("upload_file", file);
    formData.append("userPrompt", userPrompt);
    fetch("http://127.0.0.1:8000/summarize", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => handleResponse(data, !!data.error))
      .catch(() => handleResponse({ error: "Not able to complete your request" }, true));
  };

  const resolveQuery = () => {
    if (!file) {
      setError("Please upload a file");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("upload_file", file);
    formData.append("userPrompt", userPrompt);
    fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => handleResponse(data, !!data.error))
      .catch(() => handleResponse({ error: "Not able to complete your request" }, true));
  };

  const handleChange = (event) => {
    setUserPrompt(event.target.value);
  };

  const logOut = () => {
    localStorage.clear();
    push("/");
  };

  return (
    <div className="flex flex-col h-screen items-center max-w-[700px] m-auto pt-5">
      <div className="flex justify-center mt-2">
        <Image src={logo} alt="Logo" height={100} width={100} />
      </div>
      <h1 className="text-2xl mt-5 font-bold text-center">
        Summarize & Chat with File
      </h1>
      <div className="m-5">
        <p className="text-md mt-2 text-center">
          Upload a PDF, DOCX, or TXT file to get a summary or chat with it.
        </p>
      </div>
      {Summary.length > 0 ? (
        <>
          {Summary.map((item, index) => (
            <div key={index} className="w-full px-8 mt-10">
              <p className="text-md text-left font-bold">{index === 0 ? "Summary Prompt" : "Question"}</p>
              <div className="bg-zinc-900 p-3 rounded-lg mt-2">
                <p className="text-md text-left">
                  {item.userPrompt === "" ? <i>User Prompt is Empty</i> : item.userPrompt}
                </p>
              </div>
              <p
                dangerouslySetInnerHTML={{ __html: item.summary }}
                className="text-md mt-5 text-left whitespace-pre-line"
              ></p>
            </div>
          ))}
          {loading ? (
            <div className="m-auto my-20">
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600 m-auto mt-5"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5531C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7235 75.2124 7.55341C69.5422 4.3833 63.2754 2.51562 56.7663 2.05116C51.766 1.69331 46.7392 2.10256 41.8381 3.26158C39.3255 3.84671 37.861 6.34573 38.4981 8.77102C39.1353 11.1963 41.6078 12.6181 44.1491 12.1809C47.782 11.538 51.4868 11.561 55.0785 12.2453C60.3492 13.3041 65.283 15.4127 69.4458 18.4519C73.6085 21.491 77.0079 25.3778 79.4096 29.8826C81.5465 33.9716 83.1155 38.3713 84.0788 42.9639C84.5993 45.7953 87.5421 47.4301 90.1479 46.6502C92.7537 45.8702 94.2752 42.9868 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <p className="text-md text-center mt-5">Processing...</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-10 mt-10 w-full px-8">
              <div>
                <Label className="text-left" htmlFor="message">
                  Your Message
                </Label>
                <div className="relative mt-2">
                  <Textarea
                    onChange={handleChange}
                    value={userPrompt}
                    placeholder="Ask a question about the file..."
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <Button
                  onClick={resolveQuery}
                  className="bg-zinc-900 text-white w-full"
                >
                  Ask a Question
                </Button>
                <Button
                  onClick={anotherSummary}
                  className="bg-white text-black w-full border border-zinc-900"
                >
                  Upload New File
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full px-8 mt-10">
          <div className="flex flex-col space-y-10 mt-10">
            <div>
              <Label className="text-left" htmlFor="file">
                File
              </Label>
              <Input
                id="file"
                onChange={fileAccepted}
                type="file"
                accept=".pdf, .docx, .txt"
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>
            <div>
              <Label className="text-left" htmlFor="message">
                Message
              </Label>
              <Textarea
                id="message"
                onChange={handleChange}
                value={userPrompt}
                placeholder="Enter your message here..."
              />
            </div>
            <Button
              onClick={generateSummary}
              className="bg-zinc-900 text-white"
            >
              Generate Summary
            </Button>
            <Button
              onClick={resolveQuery}
              className="bg-zinc-900 text-white"
            >
              Ask a Question
            </Button>
          </div>
        </div>
      )}
      <Button
        onClick={logOut}
        className="absolute bottom-5 left-5 bg-white text-black border border-zinc-900"
      >
        Log Out
      </Button>
    </div>
  );
}
