// Type definitions for SimpleTypoChecker
// Project: https://github.com/bonprosoft/SimpleTypoChecker
// Definitions by: Yuki Igarashi <https://github.com/bonprosoft/>

/*
	Common Types
*/

interface Grammer {
    mode: CheckMode;
    severity:  SeverityType;
    pattern: string;
    arg: string;
    message: string;
	suggestion: string;
}

declare const enum SeverityType {
	Hint = 0,
	Info = 1,
	Warn = 2,
	Error = 3
}

declare const enum CheckMode {
	 CompleteMatch = 0,
	 LeftHandIncompleteMatch = 1,
	 RightHandIncompleteMatch = 2
}
