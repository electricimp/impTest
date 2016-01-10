function formatTable(table, margin = 4, tabWidth = 2) {

	local indent = function (n) {
		local ret = "";

		for (local i = 0; i < n; ++i) {
      ret += " ";
    }

		return ret;
	}

	local ret = "";

	foreach (key, value in table) {

		ret += indent(margin);
		ret += key;

		switch (type(value)) {
			case "table":
				ret += " = {\n";
				ret += formatTable(value, margin + tabWidth, tabWidth);
				ret += indent(margin);
				ret += "}";
				break

      case "array":
				ret += " = [\n";
				ret += formatTable(value, margin + tabWidth, tabWidth);
				ret += indent(margin);
				ret += "]";
				break

      case "string":
				ret += " = \"";
				ret += value;
				ret += "\"";
				break;

			default:
				ret += " = ";
				ret += value;
				break;
		}

		ret += "\n";
	}

	return ret;
}
