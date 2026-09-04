export default function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? "bg-white/90 backdrop-blur-md shadow-md border-b border-green-100"
      : "bg-transparent"
  }`;

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              ERP
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">

            <Link
              to="/employer/jobs"
              className="px-5 py-2 rounded-xl bg-green-600 text-white font-medium shadow-sm hover:bg-green-700 transition-all duration-200"
            >
              Login
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <FaTimes className="text-2xl" />
            ) : (
              <FaAlignRight className="text-2xl" />
            )}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-green-100 shadow-lg">
          <div className="px-6 py-6 space-y-5">

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2.5 pl-10 rounded-xl border border-green-200 bg-green-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-sm"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Links */}
            <div className="space-y-3 text-sm font-medium">

              <Link
                to="/joblistings"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Find Jobs
              </Link>

              <Link
                to="/companies"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Companies
              </Link>

              <Link
                to="/resources"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Resources
              </Link>

              <div className="border-t border-green-100 pt-3" />

              <Link
                to="/profile"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Profile
              </Link>

              <Link
                to="/applications"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Applications
              </Link>

              <Link
                to="/settings"
                className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
              >
                Settings
              </Link>

              <Link
                to="/post-job"
                className="block mt-4 px-4 py-3 rounded-xl bg-green-600 text-white text-center font-semibold hover:bg-green-700 transition"
              >
                Post a Job
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
