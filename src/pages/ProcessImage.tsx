import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Main from "@components/Main";
import { ImageCropper } from "@components/ImageCropper";
import ImageControls from "@components/ImageControls";
import type { Crop, PixelCrop } from "react-image-crop";
import { imgPreview } from "@utils/imgGenerateUrl";
import ConfirmImage from "@components/ConfirmImage";
import { processImageWithTesseract } from "@utils/tesseract";
import toast from "react-hot-toast";
import LoadingComponent from "@components/LoadingComponent";
import module from "./processImage.module.css";
import ShowText from "@components/ShowText";

interface ProcessImagePageProps {
  image?: string | null;
  setImage: (image: string | null) => void;
}

const ProcessImagePage: React.FC<ProcessImagePageProps> = ({
  image,
  setImage,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [language, setLanguage] = useState<string>("por");
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomMessage, setZoomMessage] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [text, setText] = useState<string>("");

  const imgRef = useRef<HTMLImageElement | null>(null);
  const textResultRef = useRef<HTMLDivElement | null>(null);

  const resetPosition = useCallback(() => {
    setCrop({
      unit: "%",
      width: 50,
      height: 50,
      x: 25,
      y: 25,
    });
    setScale(1);
  }, []);

  const onCropComplete = useCallback(
    async (crop: PixelCrop) => {
      if (!imgRef.current) {
        console.error("Image reference is not set.");
        return;
      }

      const url = await imgPreview(imgRef.current, crop, scale, 0);

      setPreviewUrl(url);
      setZoomMessage(false);
      setIsCompleted(true);
    },
    [imgRef, scale, setPreviewUrl, setZoomMessage, setIsCompleted]
  );

  const processImage = useCallback(async () => {
    if (!previewUrl) {
      toast.error("Por favor, selecione uma área da imagem.");
      return;
    }

    try {
      setIsLoading(true);
      setText("");

      const text = await processImageWithTesseract(previewUrl, {
        language,
        onProgress: (progress) => {
          const progressPercentage = Math.round(progress.progress * 100);
          setProgress(progressPercentage);
        },
      });

      toast.success("Texto extraído com sucesso!");

      setText(text);
      setIsLoading(false);
      setProgress(0);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Erro ao processar a imagem.");
      setIsLoading(false);
      setProgress(0);
      setText("");
    }
  }, [previewUrl, language, setIsLoading, setText, setProgress]);

  const imageControlsComponent = useMemo(
    () => (
      <ImageControls
        onCleanImage={() => setImage(null)}
        onScaleChange={setScale}
        onLanguageChange={setLanguage}
        language={language}
        scale={scale}
        ResetCrop={resetPosition}
      />
    ),
    [language, scale, resetPosition, setImage, setScale, setLanguage]
  );

  const imageCropperComponent = useMemo(
    () =>
      image && (
        <ImageCropper
          image={image}
          scale={scale}
          crop={crop}
          setCrop={setCrop}
          onCropComplete={onCropComplete}
          imageRef={imgRef}
          isLoading={isLoading}
        />
      ),
    [image, scale, crop, setCrop, onCropComplete, imgRef, isLoading]
  );

  useEffect(() => {
    if (isCompleted) {
      setZoomMessage(true);
    }
  }, [scale]);

  useEffect(() => {
    if (text && textResultRef.current) {
      textResultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [text]);

  return (
    <>
      <Main>
        {imageControlsComponent}
        <div className={`${module.process_image_edit_image} `}>
          {imageCropperComponent}

          <LoadingComponent isLoading={isLoading} percentage={progress} />
        </div>

        <ConfirmImage
          zoomMessage={zoomMessage}
          isCompleted={isCompleted}
          handleClick={processImage}
          isLoading={isLoading}
        />
      </Main>
      {text && <ShowText text={text} reference={textResultRef} />}
    </>
  );
};

export default ProcessImagePage;
