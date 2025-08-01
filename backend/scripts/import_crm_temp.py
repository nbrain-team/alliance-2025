import os
import sys
import csv
from io import StringIO

# Add parent directory to path to import from core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Base, Contact
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample of the CSV data (first 100 rows for testing)
CSV_DATA = """Email,Name
TIM.M.ROBBINS@GMAIL.COM,-- timothy
markldennes@gmail.com,@MarkDennes
aghughes99@gmail.com,A Hughes
ariryan@verizon.net,A R
andrewnordrach@gmail.com,a_reichs
andivekar@gmail.com,A. Divekar
abacus@firstcoastmtg.com,Aaron  Bacus
aaron@rosewoodrg.com,Aaron Jungreis
paddupadma0123@gmail.com,Abhi
abhik1368@gmail.com,Abhik Seal
abigail.frost@gmail.com,Abigail Frost
abinasroy@gmail.com,abinas
abdrive@abdrive.com,Abraham Joseph
gbgllc@hushmail.com,Account Manager
Adam@advsoy.com,Adam
Adam@axelradbeergarden.com,Adam Brackman
ADAMJBROUSSARD@GMAIL.COM,Adam Broussard
ae@thirdcreekadvisors.com,Adam Epstein
ackiss@gmail.com,Adam Peters
russ@berkeleycap.com,Adam Russ
adam.schmitt@cbre.com,Adam Schmitt
ateite2@gmail.com,Adam Teitelman
adam@tameware.com,Adam Wildavsky
adam.winn@lmi.com,Adamdw
adele.r.durfey@gmail.com,Adele
alabiadeeyo396@gmail.com,Aderemi Owoseni
doctorade@gmail.com,Adrian
adrielmeditz1@gmail.com,Adriel Meditz
ac3985@gmail.com,Adrienne Carter
dingfutz@gmail.com,Adrienne Forzano
anthony.you@gmail.com,Aexblno
prsmd2015@gmail.com,Afefeqi
ecco72@hotmail.com,AG
malscher@me.com,AGENT 86
annuraju1212@gmail.com,AH
ahmet.tataroglu@gmail.com,Ahmet Tataroglu
aronwhitehead@gmail.com,AJ
misra97@yahoo.com,AJ Misra
aj.ajmera@gmail.com,Ajay Ajmera
niyiajibade46@gmail.com,ajibadeniyi
akashthakrar@gmail.com,Akash
ak.ccie@me.com,Akbar
Ajtone11@gmail.com,Al Testani
pine@njwellness.com,Alan
alan@centerprop.com,Alan
alcerec8@gmail.com,alan cirilli
alan.degeorge@gmail.com,Alan DeGeorge
Dukeofhh@gmail.com,Alan Dukar
ajcollier1@gmail.com,Alan J Collier
no9to5r@gmail.com,Alan Levinstone
alan@allforhim.me,Alan Mauldin
al@almayesproperties.com,Alan Mayes
alan.mcbroom123q@gmail.com,Alan McBroom
asokolow@mac.com,Alan Sokolow
ally01230@gmail.com,Alan Wood
ajk@q.com,Albert
albert@aleaproperties.com,Albert Edward
aheiljr6@gmail.com,Albert Heil
albert@e-m.world,Albert Santos
alejandro.cmeza@blueboxmx.com,Alejandro Cortes
akulovme@gmail.com,Aleksandr Akulov
muti.alessandro@gmail.com,Alessandro Muti
alexlim29@gmail.com,Alex
yamkos@live.com,Alex Akose
alexhuckstepp@gmail.com,Alex Huckstepp
sajdc21@gmail.com,Alex James
alex@wealthymindinvestments.com,Alex Kholodenko
alexleventer@gmail.com,Alex Leventer
bbrunick@gmail.com,Alex Philomena
alexsperos@gmail.com,Alex Speros
alexa@thynkfuelmedia.com,Alexa DAgostino
alexander.bush@gmail.com,Alexander Bush
ataussig@gmail.com,Alexander Taussig
alexisgwin@gmail.com,Alexis Gwin
allq@me.com,Alfonso de la Llata
aklairmont@imperialrealtyco.com,Alfred Klairmont
alialadin@gmail.com,Ali
acarrillo9568@gmail.com,Ali
aliisamali101010@gmail.com,Ali Isam Ali
aliwitherspoon@gmail.com,Ali Witherspoon
alice.meade@icloud.com,Alice Meade
alice.palmer@gmail.com,alice.palmer
alisalisalisa@icloud.com,Alisa
arubens1123@gmail.com,Alison
alissa.levine@gmail.com,Alissa L Wong
alissa.mayer@gmail.com,Alissa Mayer
alix@ashlandcapitalfund.com,Alix kogan
abneralan@hotmail.com,Allan Apter
allan.cameron@gmail.com,Allan Cameron
abfelber@aol.com,Allan Felber
allan@revupfund.com,Allan Tear
allingirl@hotmail.com,Alli Girling
allyson@allyson.com,Allyson Hoffman
agrbic@gmail.com,Almir
ALVINHOSTETLER42@GMAIL.COM,Alvin Hostetler
alyciaclover@gmail.com,Alycia Clover
alysescaffidi@gmail.com,Alyse Scaffidi
chadbiggs@redskypr.com,Am
amareandchasity@gmail.com,Amare Johnson Johnson"""

def import_contacts_from_csv_data():
    """Import contacts from embedded CSV data into the CRM database."""
    
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment. Please set it.")
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Read CSV data from string
        csv_file = StringIO(CSV_DATA)
        csv_reader = csv.DictReader(csv_file)
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for row in csv_reader:
            try:
                # Extract email and name from CSV row
                email = row.get('Email', '').strip()
                name = row.get('Name', '').strip()
                
                # Skip if email is empty
                if not email:
                    logger.warning(f"Skipping row with empty email")
                    skipped_count += 1
                    continue
                
                # Use email as name if name is empty
                if not name:
                    name = email.split('@')[0]
                
                # Check if contact already exists
                existing_contact = db.query(Contact).filter(Contact.email == email).first()
                if existing_contact:
                    logger.info(f"Contact already exists: {email}")
                    skipped_count += 1
                    continue
                
                # Create new contact
                new_contact = Contact(
                    name=name,
                    email=email
                )
                
                db.add(new_contact)
                db.commit()
                imported_count += 1
                
                if imported_count % 10 == 0:
                    logger.info(f"Imported {imported_count} contacts so far...")
                
            except Exception as e:
                logger.error(f"Error importing contact {row}: {e}")
                error_count += 1
                db.rollback()
                continue
        
        logger.info(f"\nImport completed!")
        logger.info(f"Successfully imported: {imported_count} contacts")
        logger.info(f"Skipped (already exists): {skipped_count} contacts")
        logger.info(f"Errors: {error_count} contacts")
        
    except Exception as e:
        logger.error(f"Error processing CSV data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting import of sample contacts...")
    import_contacts_from_csv_data() 