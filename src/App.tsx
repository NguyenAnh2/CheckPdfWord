import { useState } from "react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

function App() {
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setVoiceText("");

    let hasEnded = false;
    let minDurationReached = false;

    // Sau 5 giây thì cho phép dừng nếu người dùng đã ngừng nói
    const minDurationTimer = setTimeout(() => {
      minDurationReached = true;
      if (hasEnded) {
        recognition.stop();
      }
    }, 5000);

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setVoiceText(result);
    };

    recognition.onerror = (event: any) => {
      console.error("Recognition error:", event.error);
      setIsListening(false);
      clearTimeout(minDurationTimer);
    };

    recognition.onend = () => {
      hasEnded = true;
      if (minDurationReached) {
        setIsListening(false);
      }
      // Nếu chưa đủ 5 giây thì giữ nguyên `setIsListening(true)`
    };

    recognition.start();
  };

  const [text, setText] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      // Giữ nguyên đoạn đọc PDF của bạn
      const reader = new FileReader();
      reader.onload = async () => {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }

        setText(fullText);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      // Đọc file Word
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;

        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setText(result.value); // result.value chứa toàn bộ text thuần
        } catch (err) {
          console.error("Lỗi đọc file Word:", err);
          setText("Không thể đọc file Word.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setText("Chỉ hỗ trợ file PDF và Word (.docx).");
    }
  };

  function highlightMatchedWords(pdfText: string, voiceText: string) {
    if (!voiceText.trim()) return pdfText;

    const voiceWords = voiceText.toLowerCase().split(/\s+/).filter(Boolean); // Loại bỏ khoảng trắng thừa

    const voiceWordSet = new Set(voiceWords); // Dễ tra cứu

    const wordsWithSeparators = pdfText.split(/(\s+)/); // Giữ cả dấu cách

    const result: React.ReactNode[] = wordsWithSeparators.map((word, index) => {
      const cleanWord = word.trim().toLowerCase();

      if (voiceWordSet.has(cleanWord)) {
        return (
          <span key={index} className="highlight">
            {word}
          </span>
        );
      }

      return word;
    });

    return result;
  }

  return (
    // JSX:
    <div className="container">
      <div className="card">
        <h1 className="title">Đọc file PDF</h1>
        <div className="file-section">
          <input
            type="file"
            id="fileInput"
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <div
            onClick={() => {
              const fileInput = document.getElementById(
                "fileInput"
              ) as HTMLInputElement;
              fileInput?.click();
            }}
            className="file-input"
          >
            Chọn file
          </div>
          <div className="file-description">
            <p>Chọn file PDF để đọc nội dung.</p>
          </div>
        </div>
        <div className="voice-section">
          <button
            onClick={startListening}
            disabled={isListening}
            className="btn-record"
          >
            {isListening ? "Đang ghi..." : "Ghi âm & chuyển thành văn bản"}
          </button>

          <div className="voice-text-box">
            <strong>Văn bản từ giọng nói:</strong>
            <div>{voiceText || "Chưa có dữ liệu."}</div>
          </div>
        </div>
        <div className="pdf-text-box">
          {text ? highlightMatchedWords(text, voiceText) : "Chưa có nội dung."}
        </div>
      </div>
    </div>
  );
}

export default App;
