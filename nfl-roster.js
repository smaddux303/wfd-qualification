// nfl-roster.js — Historical NFL player names for alias matching
// Source: Curated from public NFL historical records
// ~500 well-known players across all eras for alias generation
// This list is intentionally broad across teams and decades

const NFL_ROSTER = [
  // QBs
  "Sammy Baugh","Otto Graham","Bobby Layne","Norm Van Brocklin","Y.A. Tittle",
  "John Unitas","Bart Starr","Fran Tarkenton","Terry Bradshaw","Roger Staubach",
  "Bob Griese","Ken Stabler","Jim Hart","Archie Manning","Dan Fouts",
  "Joe Montana","Dan Marino","John Elway","Jim McMahon","Phil Simms",
  "Boomer Esiason","Warren Moon","Jim Kelly","Troy Aikman","Steve Young",
  "Brett Favre","Vinny Testaverde","Drew Bledsoe","Mark Brunell","Trent Green",
  "Peyton Manning","Tom Brady","Donovan McNabb","Michael Vick","Matt Hasselbeck",
  "Carson Palmer","Ben Roethlisberger","Eli Manning","Philip Rivers","Tony Romo",
  "Aaron Rodgers","Matt Ryan","Drew Brees","Cam Newton","Russell Wilson",
  "Andy Dalton","Jay Cutler","Joe Flacco","Alex Smith","Colin Kaepernick",
  "Kirk Cousins","Jameis Winston","Marcus Mariota","Derek Carr","Carson Wentz",
  "Jared Goff","Patrick Mahomes","Lamar Jackson","Josh Allen","Justin Herbert",
  "Joe Burrow","Tua Tagovailoa","Mac Jones","Trevor Lawrence","Zach Wilson",

  // RBs
  "Jim Brown","Gale Sayers","Larry Csonka","Franco Harris","Walter Payton",
  "Tony Dorsett","Earl Campbell","Eric Dickerson","Marcus Allen","Herschel Walker",
  "Bo Jackson","Barry Sanders","Emmitt Smith","Thurman Thomas","Ricky Watters",
  "Curtis Martin","Jerome Bettis","Edgerrin James","Marshall Faulk","Warrick Dunn",
  "Jamal Lewis","Priest Holmes","Clinton Portis","LaDainian Tomlinson","Brian Westbrook",
  "Steven Jackson","Adrian Peterson","Frank Gore","Arian Foster","Ray Rice",
  "Matt Forte","DeMarco Murray","Marshawn Lynch","Eddie Lacy","Jamaal Charles",
  "Le'Veon Bell","Todd Gurley","Ezekiel Elliott","Kareem Hunt","Saquon Barkley",
  "Christian McCaffrey","Derrick Henry","Dalvin Cook","Nick Chubb","Josh Jacobs",
  "Alvin Kamara","Aaron Jones","Jonathan Taylor","Joe Mixon","Cam Akers",
  "Manny Fernandez","Mercury Morris","Jim Kiick","Norm Bulaich","Don Nottingham",

  // WRs
  "Don Hutson","Lance Alworth","Paul Warfield","Fred Biletnikoff","Lynn Swann",
  "John Stallworth","Charlie Joiner","Steve Largent","James Lofton","Art Monk",
  "Jerry Rice","Andre Reed","Michael Irvin","Cris Carter","Tim Brown",
  "Herman Moore","Isaac Bruce","Terrell Owens","Randy Moss","Marvin Harrison",
  "Hines Ward","Reggie Wayne","Chad Johnson","Steve Smith","Larry Fitzgerald",
  "Anquan Boldin","Santana Moss","Donald Driver","Wes Welker","Percy Harvin",
  "Calvin Johnson","A.J. Green","Dez Bryant","Brandon Marshall","Victor Cruz",
  "Demaryius Thomas","Jordy Nelson","Antonio Brown","Julio Jones","Odell Beckham",
  "DeAndre Hopkins","Mike Evans","Davante Adams","Tyreek Hill","Cooper Kupp",
  "Justin Jefferson","Stefon Diggs","Amari Cooper","D.K. Metcalf","CeeDee Lamb",
  "Ja'Marr Chase","Jaylen Waddle","Tee Higgins","Terry McLaurin","Diontae Johnson",

  // TEs
  "Mike Ditka","Charlie Sanders","Kellen Winslow","Ozzie Newsome","Todd Christensen",
  "Keith Jackson","Shannon Sharpe","Ben Coates","Wesley Walls","Tony Gonzalez",
  "Bubba Franks","Todd Heap","Alge Crumpler","Antonio Gates","Jason Witten",
  "Vernon Davis","Dallas Clark","Jimmy Graham","Rob Gronkowski","Greg Olsen",
  "Jordan Reed","Zach Ertz","Travis Kelce","George Kittle","Darren Waller",
  "Mark Andrews","T.J. Hockenson","Kyle Pitts","Dallas Goedert","Jonnu Smith",

  // OL
  "Jim Parker","Gene Upshaw","Art Shell","Anthony Munoz","Mike Webster",
  "John Hannah","Russ Grimm","Joe Jacoby","Randall McDaniel","Gary Zimmerman",
  "Bruce Matthews","Will Shields","Larry Allen","Orlando Pace","Jonathan Ogden",
  "Walter Jones","Willie Roaf","Alan Faneca","Steve Hutchinson","Matt Light",
  "Jordan Gross","Jake Long","Joe Thomas","Jason Peters","Trent Williams",
  "Tyron Smith","Zack Martin","Andrew Whitworth","David Bakhtiari","Quenton Nelson",
  "Mekhi Becton","Penei Sewell","Rashawn Slater","Christian Darrisaw","Teven Jenkins",

  // DL
  "Gino Marchetti","Deacon Jones","Merlin Olsen","Bob Lilly","Alan Page",
  "Mean Joe Greene","Randy White","Lee Roy Selmon","Harvey Martin","Howie Long",
  "Reggie White","Bruce Smith","Cortez Kennedy","Warren Sapp","Dana Stubblefield",
  "La'Roi Glover","Richard Seymour","Dwight Freeney","Julius Peppers","Justin Smith",
  "Jared Allen","Haloti Ngata","Ndamukong Suh","Gerald McCoy","J.J. Watt",
  "Chandler Jones","Cameron Jordan","Myles Garrett","Nick Bosa","Micah Parsons",
  "Aaron Donald","Chris Jones","Maxx Crosby","Grady Jarrett","Deforest Buckner",

  // LBs
  "Chuck Bednarik","Ray Nitschke","Dick Butkus","Willie Lanier","Jack Ham",
  "Jack Lambert","Ted Hendricks","Harry Carson","Lawrence Taylor","Andre Tippett",
  "Mike Singletary","Karl Mecklenburg","Derrick Thomas","Pat Swilling","Cornelius Bennett",
  "Junior Seau","Kevin Greene","Bryce Paup","Zach Thomas","Ray Lewis",
  "Brian Urlacher","Takeo Spikes","Adalius Thomas","Patrick Willis","DeMarcus Ware",
  "Clay Matthews","Von Miller","Terrell Suggs","Elvis Dumervil","Aldon Smith",
  "Bobby Wagner","Luke Kuechly","Dont'a Hightower","Kwon Alexander","Lavonte David",
  "Deion Jones","Roquan Smith","Fred Warner","Micah Parsons","T.J. Watt",

  // DBs
  "Emlen Tunnell","Dick Night Train Lane","Mel Blount","Mike Haynes","Ronnie Lott",
  "Darrell Green","Rod Woodson","Deion Sanders","Aeneas Williams","Charles Woodson",
  "Ed Reed","Troy Polamalu","Champ Bailey","Darrelle Revis","Patrick Peterson",
  "Richard Sherman","Earl Thomas","Eric Berry","Malcolm Jenkins","Tyrann Mathieu",
  "Stephon Gilmore","Jalen Ramsey","Xavien Howard","Darius Slay","Marlon Humphrey",
  "Trevon Diggs","A.J. Terrell","Sauce Gardner","Derek Stingley","Kyle Hamilton",
  "Nick Collins","Antoine Bethea","Jairus Byrd","Marcus Peters","Budda Baker",

  // Special teams / other notables
  "Jan Stenerud","Ray Guy","Morten Andersen","Gary Anderson","Jason Elam",
  "Adam Vinatieri","David Akers","Stephen Gostkowski","Justin Tucker","Robbie Gould",
  "Nick Lowery","John Carney","Matt Stover","Sebastian Janikowski","Billy Cundiff",
  "Devin Hester","Dante Hall","Josh Cribbs","Leon Washington","Cordarrelle Patterson",

  // Additional 1972 Miami Dolphins for the Chief
  "Earl Morrall","Howard Twilley","Paul Warfield","Marlin Briscoe","Otto Stowe",
  "Jim Mandich","Norm Evans","Bob Kuechenberg","Larry Little","Jim Langer",
  "Bob DeMarco","Vern Den Herder","Bill Stanfill","Bob Heinz","Maulty Moore",
  "Nick Buoniconti","Mike Kolen","Doug Swift","Bob Matheson","Dick Anderson",
  "Jake Scott","Lloyd Mumphord","Curtis Johnson","Tim Foley","Charlie Babb",
  "Garo Yepremian","Larry Seiple","Jim Del Gaizo","Don Shula"
];
