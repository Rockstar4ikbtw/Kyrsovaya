using autosalon.Data;
using autosalon.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
    .WithOrigins(
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    )
    .AllowAnyHeader()
    .AllowAnyMethod();
    });
});
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    SeedData(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("frontend");
app.UseAuthorization();
app.MapControllers();
app.Run();

static void SeedData(AppDbContext db)
{
    var unhashed = db.Users.Where(u => u.Password.Length < 60).ToList();
    if (unhashed.Count > 0)
    {
        foreach (var u in unhashed)
            u.Password = Sha256(u.Password);
        db.SaveChanges();
    }

    if (!db.Users.Any(u => u.Role == Role.Admin))
    {
        var admin = new User
        {
            Name     = "Администратор",
            Login    = "admin",
            Password = Sha256("admin123"),
            Phone    = "+7 (999) 000-00-00",
            Email    = "admin@autosalon.ru",
            Role     = Role.Admin
        };
        var manager = new User
        {
            Name     = "Иван Петров",
            Login    = "manager",
            Password = Sha256("manager123"),
            Phone    = "+7 (916) 100-11-11",
            Email    = "petrov@autosalon.ru",
            Role     = Role.Manager
        };
        var client1 = new User
        {
            Name     = "Сергей Иванов",
            Login    = "client1",
            Password = Sha256("client123"),
            Phone    = "+7 (916) 222-33-44",
            Email    = "ivanov@mail.ru",
            Role     = Role.User
        };
        var client2 = new User
        {
            Name     = "Анна Смирнова",
            Login    = "client2",
            Password = Sha256("client123"),
            Phone    = "+7 (916) 555-66-77",
            Email    = "smirnova@mail.ru",
            Role     = Role.User
        };
        db.Users.AddRange(admin, manager, client1, client2);
        db.SaveChanges();
    }

    if (!db.Cars.Any())
    {
        db.Cars.AddRange(
            new Car { Brand = "Toyota Camry",    Year = new DateTime(2022, 1, 1), Price = 2_800_000, State = "Новый" },
            new Car { Brand = "BMW 5 Series",    Year = new DateTime(2021, 1, 1), Price = 4_500_000, State = "Новый" },
            new Car { Brand = "Hyundai Solaris", Year = new DateTime(2019, 1, 1), Price =   950_000, State = "С пробегом" },
            new Car { Brand = "Kia Rio",         Year = new DateTime(2020, 1, 1), Price = 1_100_000, State = "С пробегом" }
        );
        db.SaveChanges();
    }

    if (!db.Sales.Any())
    {
        var manager = db.Users.First(u => u.Role == Role.Manager);
        var clients = db.Users.Where(u => u.Role == Role.User).ToList();
        var cars    = db.Cars.ToList();

        if (cars.Count >= 2 && clients.Count >= 2)
        {
            var sale1 = new Sale
            {
                Brand     = cars[0].Brand,
                Date      = DateTime.UtcNow.AddDays(-30),
                Price     = (int)cars[0].Price,
                CarId     = cars[0].Id,
                ClientId  = clients[0].Id,
                ManagerId = manager.Id
            };
            var sale2 = new Sale
            {
                Brand     = cars[1].Brand,
                Date      = DateTime.UtcNow.AddDays(-10),
                Price     = (int)cars[1].Price,
                CarId     = cars[1].Id,
                ClientId  = clients[1].Id,
                ManagerId = manager.Id
            };
            db.Sales.AddRange(sale1, sale2);
            db.SaveChanges();

            db.Payments.AddRange(
                new Payment
                {
                    Sum       = (int)cars[0].Price,
                    DateTime  = DateTime.UtcNow.AddDays(-28),
                    SaleId    = sale1.Id,
                    ManagerId = manager.Id,
                    Note      = "Полная оплата"
                },
                new Payment
                {
                    Sum       = 1_000_000,
                    DateTime  = DateTime.UtcNow.AddDays(-9),
                    SaleId    = sale2.Id,
                    ManagerId = manager.Id,
                    Note      = "Предоплата"
                }
            );
            db.SaveChanges();
        }
    }
}

static string Sha256(string input)
{
    var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input));
    return string.Concat(bytes.Select(b => b.ToString("x2")));
}
