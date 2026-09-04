import React, { forwardRef } from 'react';
import { FaInstagram } from "react-icons/fa";
import { FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaLinkedin } from "react-icons/fa";
import { BiSupport } from "react-icons/bi";
import { SiMinutemailer } from "react-icons/si";
import { FaLocationDot } from "react-icons/fa6";
import image from '../../assets/letter_send 1.png'

const cn = (...classes) => {
    return classes.filter(Boolean).join(' ');
};

const Input = forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

const Textarea = forwardRef(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = "Textarea";

const Button = forwardRef(({ className, type = "button", ...props }, ref) => {
    return (
        <button
            type={type}
            className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = "Button";

const Label = forwardRef(({ className, ...props }, ref) => {
    return (
        <label
            ref={ref}
            className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
            {...props}
        />
    );
});
Label.displayName = "Label";

const RadioGroupItem = forwardRef(({ className, value, checked, onChange, ...props }, ref) => {
    return (
        <input
            type="radio"
            ref={ref}
            value={value}
            checked={checked}
            onChange={onChange}
            className={cn(
                "w-[13px] h-[13px] rounded-full border border-black appearance-none cursor-pointer checked:bg-black checked:border-black checked:shadow-[inset_0_0_0_2px_white]",
                className
            )}
            {...props}
        />
    );
});
RadioGroupItem.displayName = "RadioGroupItem";

const Card = ({ className, ...props }) => (
    <div
        className={cn("rounded-lg border bg-white text-gray-950 shadow-sm", className)}
        {...props}
    />
);

const CardContent = ({ className, ...props }) => (
    <div className={cn("p-6", className)} {...props} />
);

const contactInfo = [
    {
        icon: "/bxs-phone-call.svg",
        text: "+1012 3456 789",
    },
    {
        icon: "/ic-sharp-email.svg",
        text: "demo@gmail.com",
    },
];




const subjectOptions = [
    { id: "general-1", label: "General Inquiry" },
    { id: "general-2", label: "Technical Support" },
    { id: "general-3", label: "Feedback" },
    { id: "general-4", label: "Partnership" },
];

export const Support = () => {
    const [selectedSubject, setSelectedSubject] = React.useState("general-1");
    const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Form submitted:", { ...formData, subject: selectedSubject });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="bg-gray-50 w-full min-h-screen flex flex-col items-center py-12 sm:py-10 lg:py-[4vh] px-4 sm:px-6 lg:px-4">
            <header className="flex flex-col gap-2.5 mb-8 sm:mb-12 lg:mb-[50px] max-w-[466px] w-full">
                <h1 className="text-center font-['Poppins',Helvetica] font-bold text-gray-600 text-3xl sm:text-4xl lg:text-[40px] tracking-[0] leading-tight sm:leading-[60px]">
                    Contact Us
                </h1>
                <p className="text-center font-['Poppins',Helvetica] font-medium text-gray-600 text-base sm:text-lg tracking-[0] leading-relaxed sm:leading-[27px]">
                    Any question or remarks? Just write us a message!
                </p>
            </header>

            <Card className="w-full max-w-[1196px] rounded-[10px] shadow-[0px_0px_60px_30px_#00000008] border-0 overflow-hidden">
                <CardContent className="p-0 flex flex-col lg:flex-row gap-0">
                    <div className="bg-green-600 relative w-full lg:w-[491px] h-[500px] sm:h-[600px] lg:h-[647px] rounded-none lg:rounded-[10px] overflow-hidden">


                        <div className="absolute bottom-0 right-0 w-[200px] h-[200px] sm:w-[269px] sm:h-[269px] bg-[#ffe2097a] rounded-full transform translate-x-1/3 translate-y-1/3" />
                        <div className="absolute bottom-8 right-4 sm:bottom-[50px] sm:right-[50px] w-[100px] h-[100px] sm:w-[138px] sm:h-[138px] bg-[#dbd14080] rounded-full" />

                        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col h-full">
                            <div className="flex flex-col gap-4 sm:gap-6">
                                <h2 className="font-['Poppins',Helvetica] font-semibold text-white text-xl sm:text-2xl lg:text-[28px] tracking-[0] leading-normal">
                                    Contact Information
                                </h2>

                                <p className="font-['Poppins',Helvetica] font-normal text-gray-300 text-base sm:text-lg tracking-[0] leading-normal">
                                    Say something to start a live chat!
                                </p>
                            </div>

                            <div className="flex flex-col gap-8 sm:gap-12 lg:gap-[74px] mt-12 sm:mt-16 lg:mt-[90px]">
                                <div className="flex items-center gap-4 sm:gap-[25px]">
                                    <a
                                        href="tel:+91 94861 06953"
                                        className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                    >
                                        <BiSupport />
                                    </a>

                                    <span className="font-['Poppins',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-normal">
                                        +91 94861 06953


                                    </span>
                                </div>

                                <div className="flex items-center gap-4 sm:gap-[25px]">
                                    <a
                                        href="#"
                                        className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110 "
                                    >
                                        <SiMinutemailer />
                                    </a>
                                    <span className="font-['Poppins',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-normal">
                                        support@swordnex.com
                                    </span>
                                </div>

                                <div className="flex items-start gap-4 sm:gap-[25px]">
                                    <a
                                        href="https://maps.app.goo.gl/PyYa5GEUWRnf9ooX8"
                                        target='_blank'
                                        className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                    >
                                        <FaLocationDot />
                                    </a>
                                    <span className="text-white font-['Poppins',Helvetica] font-normal text-sm sm:text-base tracking-[0] leading-normal max-w-[290px]">
                                        132 Dartmouth Street Boston, Massachusetts 02156 United States
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-4 sm:gap-6 mt-auto pt-8 justify-center">
                                {/* Instagram */}
                                <a
                                    href="#"
                                    className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                >
                                    <FaInstagram className='text-lg' />
                                </a>

                                {/* Facebook */}
                                <a
                                    href="#"
                                    className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                >
                                    <FaFacebook className='text-lg' />
                                </a>

                                {/* X / Twitter */}
                                <a
                                    href="#"
                                    className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                >
                                    <FaXTwitter className='text-lg' />
                                </a>

                                {/* LinkedIn */}
                                <a
                                    href="#"
                                    className="p-3 rounded-full bg-white text-white hover:bg-green-400 hover:text-green-600 border border-white transition-all duration-300 hover:scale-110"
                                >
                                    <FaLinkedin className='text-lg' />
                                </a>
                            </div>

                        </div>
                    </div>

                    <div className="flex-1 p-6 sm:p-8 lg:p-10 lg:pl-[60px] lg:pr-[60px] lg:pt-[60px] relative">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                                <div className="flex flex-col gap-3">
                                    <Label
                                        htmlFor="firstName"
                                        className="font-['Poppins',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-5"
                                    >
                                        First Name
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            className="w-full ps-10 p-2.5 text-sm text-gray-900 bg-white border-0 border-b-2 border-gray-300 focus:outline-none focus:border-green-500 dark:bg-transparent dark:text-white text-center"
                                            placeholder=""
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Label
                                        htmlFor="lastName"
                                        className="font-['Poppins',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-5"
                                    >
                                        Last Name
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            className="w-full ps-10 p-2.5 text-sm text-gray-900 bg-white border-0 border-b-2 border-gray-300 focus:outline-none focus:border-green-500 dark:bg-transparent dark:text-white text-center"
                                            placeholder=""
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                                <div className="flex flex-col gap-3">
                                    <Label
                                        htmlFor="email"
                                        className="font-['Poppins',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-5"
                                    >
                                        Email
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full ps-10 p-2.5 text-sm text-gray-900 bg-white border-0 border-b-2 border-gray-300 focus:outline-none focus:border-green-500 dark:bg-transparent dark:text-white text-center"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Label
                                        htmlFor="phone"
                                        className="font-['Poppins',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-5"
                                    >
                                        Phone Number
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full ps-10 p-2.5 text-sm text-gray-900 bg-white border-0 border-b-2 border-gray-300 focus:outline-none focus:border-green-500 dark:bg-transparent dark:text-white text-center"
                                            placeholder=""
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:gap-[15px]">
                                <Label className="font-['Poppins',Helvetica] font-semibold text-gray-600 text-sm tracking-[0] leading-5">
                                    Select Subject?
                                </Label>
                                <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-[18px] gap-y-3 sm:gap-y-2">
                                    {subjectOptions.map((option) => (
                                        <div key={option.id} className="flex items-center gap-2 sm:gap-2.5">
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                checked={selectedSubject === option.id}
                                                onChange={(e) => setSelectedSubject(e.target.value)}
                                            />
                                            <Label
                                                htmlFor={option.id}
                                                className="font-['Poppins',Helvetica] font-normal text-gray-600 text-xs tracking-[0] leading-5 cursor-pointer"
                                            >
                                                {option.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Label
                                    htmlFor="message"
                                    className="font-['Poppins',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-5"
                                >
                                    Message
                                </Label>
                                <div className="relative">
                                    <Textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        placeholder="Write your message.."
                                        className="w-full ps-10 p-2.5 text-sm text-gray-900 bg-white border-0 border-b-2 border-gray-300 focus:outline-none focus:border-green-500 dark:bg-transparent dark:text-white text-center"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center sm:justify-end items-center relative mt-6 sm:mt-8 lg:mt-[37px]">
                                <img
                                    className="lg:block absolute right-[133px] bottom-[-20px] w-[265px] h-[217px] opacity-20 pointer-events-none"
                                    alt="Letter send illustration"
                                    src={image}
                                />
                                <Button
                                    type="submit"
                                    className="w-full sm:w-auto bg-black text-white px-8 sm:px-12 py-3 sm:py-[15px] rounded-[5px] shadow-[0px_0px_14px_#0000001f] font-['Poppins',Helvetica] font-medium text-base hover:bg-black/90 h-auto relative z-10 transition-colors"
                                >
                                    Send Message
                                </Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Support;
