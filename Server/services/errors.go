package services

func Check(e error, rest ...func(error)) bool {
	if e != nil {
		if len(rest) > 0 {
			rest[0](e)
		}
		return true
	}
	return false
}
