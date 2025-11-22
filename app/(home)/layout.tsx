import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function HomeRootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="relative min-h-screen w-full ">
            <Navbar />
            {children}
            <Footer />
        </main>
    )
}