export function isTeacherNavActive(pathname: string, href: string): boolean {
  if (href === "/teacher") {
    return pathname === "/teacher";
  }
  if (href === "/teacher/groups") {
    return (
      pathname === "/teacher/groups" ||
      pathname.startsWith("/teacher/groups/") ||
      pathname.startsWith("/teacher/classes/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function parentTeacherPath(pathname: string): string | null {
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts[0] !== "teacher" || parts.length < 3) return null;

  if (parts.length >= 7 && parts[5] === "submissions") {
    return `/${parts.slice(0, 5).join("/")}`;
  }
  if (parts.length >= 5 && (parts[3] === "sessions" || parts[3] === "students")) {
    return `/${parts.slice(0, 3).join("/")}`;
  }
  if (parts[1] === "classes") {
    return "/teacher/groups";
  }
  return "/teacher/groups";
}
