interface ButtonAddFileProps {
  type: string;
  accept?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

const ButtonAddFile: React.FC<ButtonAddFileProps> = ({
  type,
  accept,
  onChange,
}) => {
  return (
    <div className="relative ">
      <input
        type={type}
        accept={accept}
        onChange={onChange}
        id="file-input"
        className="hidden"
      />
      <label
        htmlFor="file-input"
        className="cursor-pointer w-full h-full bg-black flex items-center justify-center border border-white relative group"
      >
        {/* Góc tam giác trắng khi hover */}
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[0.9rem] border-l-[0.9rem] border-transparent border-l-white group-hover:border-l-[2.5rem] group-hover:border-t-[2.5rem] transition-all duration-200"></div>

        {/* Icon dấu cộng */}
        <svg
          className="w-1 h-1 fill-white group-hover:fill-black group-hover:rotate-180 transition-all duration-200 z-10"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 30 30"
        >
          <path d="M13.75 23.75V16.25H6.25V13.75H13.75V6.25H16.25V13.75H23.75V16.25H16.25V23.75H13.75Z" />
        </svg>
      </label>
    </div>
  );
};

export default ButtonAddFile;
